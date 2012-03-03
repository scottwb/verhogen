var _     = require('underscore');
var Redis = require('redis');

module.exports = function(name, redisOpts) {
  var self         = this;
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
    _client.auth(_redisOpts.password, function(err, reply) {
      if (err) {
        console.log('AUTH ERROR: ' + err);
      }
      else if (reply) {
        console.log('AUTH: ' + reply);
        _createIfNecessary();
      }
    });
  }

  function _existsKey() {
    return "mutex:" + name + ":exists";
  }

  function _listKey() {
    return "mutex:" + name + ":list";
  }

  function _createIfNecessary() {
    _client.getset(_existsKey(), 1, function(err, reply) {
      if (reply != '1') {
        _client.lpush(_listKey(), 1);
      }
    });
  }


  ////////////////////////////////////////////////////////////
  // Public Methods
  ////////////////////////////////////////////////////////////
  _(this).extend({

    acquire: function(timeout, onAcquired) {
      if (timeout === undefined) {
        timeout = 0;
      }

      _client.brpop(_listKey(), timeout, function(err, reply) {
        _holdingLock = true;
        onAcquired();
      });
    },

    release: function() {
      if (_holdingLock) {
        _client.lpush(_listKey(), 1, function(err, reply) {
          _holdingLock = false;
        });
      }
    },
  });
  
  _init();
};
