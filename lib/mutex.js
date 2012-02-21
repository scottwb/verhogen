var _u    = require('./underscore-min');
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
    if (_redisOpts === undefined) {
      _redisOpts = {};
    }
    _u(_redisOpts).defaults({
      port : 6379,
      host : 'verhogen.com',
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
        _createIfNecessary(function(){});
      }
    });
  }

  function _existsKey() {
    return "mutex:" + name + ":exists";
  }

  function _listKey() {
    return "mutex:" + name + ":list";
  }

  function _createIfNecessary(callback) {
    _client.getset(_existsKey(), 1, function(err, reply) {
      if (reply != '1') {
        _client.lpush(_listKey(), 1, function(err, reply) {
          callback();
        });
      }
      else {
        callback();
      }
    });
  }
  

  ////////////////////////////////////////////////////////////
  // Public Methods
  ////////////////////////////////////////////////////////////
  _u(this).extend({

    lock: function(timeout, callback) {
      if (timeout === undefined) {
        timeout = 0;
      }

      _client.brpop(_listKey(), timeout, function(err, reply) {
        _holdingLock = true;
        callback();
      });
    },

    unlock: function(callback) {
      if (_holdingLock) {
        _client.lpush(_listKey(), 1, function(err, reply) {
          _holdingLock = false;
          callback();
        });
      }
      else {
        callback();
      }
    },
  });
  
  _init();
};
