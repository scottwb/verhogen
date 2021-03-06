var _     = require('underscore');
var Uuid  = require('node-uuid');
var Redis = require('redis');

module.exports = function(name, redisOpts) {
  var self         = this;
  var _uuid        = null;
  var _name        = name;
  var _redisOpts   = redisOpts;
  var _client      = null;
  var _holdingLock = false;


  ////////////////////////////////////////////////////////////
  // Private Methods
  ////////////////////////////////////////////////////////////
  function _init() {
    if (!_redisOpts) {
      _redisOpts = {};
    }
    _(_redisOpts).defaults({
      port : 6379,
      host : 'localhost',
    });

    _client = Redis.createClient(_redisOpts.port, _redisOpts.host);
    _client.on('error', function(err) {
      console.log('Redis Error: ' + err);
    });

    var onAuth = function() {
      _createIfNecessary(function() {
        _uuid = Uuid.v4().split('-')[0];
        if (_redisOpts.onReady) {
          _redisOpts.onReady(self);
        }
      });
    };

    if (_redisOpts.password) {
      _client.auth(_redisOpts.password, function(err, reply) {
        if (err) {
          console.log('AUTH ERROR: ' + err);
        }
        else if (reply) {
          onAuth();
        }
      });
    }
    else {
      onAuth();
    }
  }

  function _existsKey() {
    return "mutex:" + name + ":exists";
  }

  function _listKey() {
    return "mutex:" + name + ":list";
  }

  function _createIfNecessary(onComplete) {
    _client.getset(_existsKey(), 1, function(err, reply) {
      if (reply != '1') {
        _client.lpush(_listKey(), 1, function(err, reply) {
          if (onComplete) {
            onComplete();
          }
        });
      }
      else {
        if (onComplete) {
          onComplete();
        }
      }
    });
  }


  ////////////////////////////////////////////////////////////
  // Public Members
  ////////////////////////////////////////////////////////////

  // REVISIT: I really want to push abandoned and response up a level
  //          into the data structure that is persisted with the controller
  //          so that it's not technically part of this core Mutex class -
  //          it's only relevant to the controller code that manages abandoning
  //          requests and reconnecting them.
  _(this).extend({

    // A flag that indicates whether or not this mutex instance
    // was abandoned by a client request.
    abandoned : false,

    // The response object to send the response to when an operation
    // on this mutex instance completes.
    response : null

  });


  ////////////////////////////////////////////////////////////
  // Public Methods
  ////////////////////////////////////////////////////////////
  _(this).extend({

    uuid: function() {
      return _uuid;
    },

    name: function() {
      return _name;
    },

    asJSON: function() {
      return {
        uuid        : _uuid,
        name        : _name,
        holdingLock : _holdingLock
      };
    },

    holdingLock: function() {
      return _holdingLock;
    },

    acquire: function(timeout, onAcquired) {
      if (timeout === undefined) {
        timeout = 0;
      }

      _client.brpop(_listKey(), timeout, function(err, reply) {
        _holdingLock = true;
        if (onAcquired) {
          onAcquired();
        }
      });
    },

    release: function(onReleased) {
      if (_holdingLock) {
        _client.lpush(_listKey(), 1, function(err, reply) {
          _holdingLock = false;
          if (onReleased) {
            onReleased();
          }
        });
      }
      else {
        if (onReleased) {
          onReleased();
        }
      }
    },

    destroy: function() {
      self.release(function() {
        _client.quit();
        _client = null;
      });
    }
  });
  
  _init();
};
