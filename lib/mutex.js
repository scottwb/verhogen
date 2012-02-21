module.exports = function(name, redisOpts) {
  var self = this;

  if (redisOpts === undefined) {
    redisOpts = {};
  }
  var redisPort = redisOpts.port || 6379;
  var redisHost = redisOpts.host || 'verhogen.com';
  var redisPass = redisOpts.password;
  
  var _holdingLock = false;
  var _redis       = require('redis');
  var _client      = _redis.createClient(redisPort, redisHost);
  _client.on('error', function(err) {
    console.log('Error ' + err);
  });
  _client.auth(redisPass, function(err, reply) {
    if (err) {
      console.log('AUTH ERROR: ' + err);
    }
    else if (reply) {
      console.log('AUTH: ' + reply);
    }
  });

  this.lock = function lock(timeout, callback) {
    if (timeout === undefined) {
      timeout = 0;
    }

    _client.brpop(this._listKey(), timeout, function(err, reply) {
      _holdingLock = true;
      callback();
    });
  };

  this.unlock = function unlock(callback) {
    if (_holdingLock) {
      _client.lpush(this._listKey(), 1, function(err, reply) {
        _holdingLock = false;
        callback();
      });
    }
    else {
      callback();
    }
  };

  this._existsKey = function _existsKey() {
    return "mutex:" + name + ":exists";
  };
  
  this._listKey = function _listKey() {
    return "mutex:" + name + ":list";
  };
  
  this._createIfNecessary = function _createIfNecessary(callback) {
    _client.getset(this._existsKey(), 1, function(err, reply) {
      if (reply != '1') {
        _client.lpush(self._listKey(), 1, function(err, reply) {
          callback();
        });
      }
      else {
        callback();
      }
    });
  };
  
};
