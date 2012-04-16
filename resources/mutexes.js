var _     = require('underscore');
var Mutex = require('../lib/mutex');

var ActiveMutexes = {};

_.extend(exports, {

  ////////////////////////////////////////////////////////////
  // RESTful Methods
  ////////////////////////////////////////////////////////////
  index: function(req, res) {
    switch (req.format) {
    case 'json':
      res.json(_.map(ActiveMutexes, function(mutex, uuid) {
        return mutex.asJSON();
      }));
      break;

    case 'html':
    default:
      res.render('mutexes/index', {
        title         : 'Active Mutexes',
        activeMutexes : ActiveMutexes
      });
      break;
    }
  },

  new: function(req, res) {
    res.render('mutexes/new', {
      title : 'Create a Mutex'
    });
  },

  create: function(req, res) {
    new Mutex(req.param('name'), {
      host     : config.redis.host,
      port     : config.redis.port,
      password : config.redis.password,
      onReady  : function(mutex) {
        ActiveMutexes[mutex.uuid()] = mutex;
        switch (req.format) {

        case 'json':
          res.json(mutex.asJSON(), 201);
          break;

        case 'html':
        default:
          res.redirect('/mutexes/' + mutex.uuid());
          break;
        }
      }
    });
  },

  destroy: function(req, res) {
    req.mutex.destroy();
    delete ActiveMutexes[req.params.mutex];

    switch (req.format) {
    case 'json':
      res.send({}, 200);
      break;

    case 'html':
    default:
      res.redirect('/mutexes')
      break;
    }
  },

  show: function(req, res) {
    switch (req.format) {

    case 'json':
      res.json(req.mutex.asJSON());
      break;

    case 'html':
    default:
      res.render('mutexes/show', {
        title : 'Mutex ' + req.mutex.uuid(),
        mutex : req.mutex
      });
      break;
    }
  },


  ////////////////////////////////////////////////////////////
  // Member Methods
  ////////////////////////////////////////////////////////////
  acquire: function(req, res) {
    // Store an indicator of who to respond to when acquire completes.
    req.mutex.response = res;

    res.connection.setTimeout(0);

    var onAbandoned = function() {
      req.mutex.abandoned = true;
      req.mutex.response  = null;
    };
    req.on('close', onAbandoned);

    var onAcquired = function() {
      if (req.mutex.response) {
        switch (req.format) {
        case 'json':
          req.mutex.response.json({'status' : 'acquired'});
          break;
        case 'html':
        default:
          req.mutex.response.redirect('/mutexes/' + req.mutex.uuid());
          break;
        }
      };
    };

    // If the mutex was previously abandoned by the client while it was
    // waiting to be acquired, that means we're picking it back up now.
    // If it has since been acquired, we can respond with onAcquired() now,
    // otherwise, we're still waiting and do nothing.
    //
    // If it hasn't been abandonded, then this is the first client call
    // to acquire, so we go ahead and acquire the mutex.
    if (req.mutex.abandoned) {
      req.mutex.abandoned = false;
      if (req.mutex.holdingLock()) {
        onAcquired();
      }
    }
    else {
      req.mutex.acquire(0, onAcquired);
    }
  },

  release: function(req, res) {
    req.mutex.release(function() {
      switch (req.format) {
      case 'json':
        res.json({'status' : 'released'});
        break;
      case 'html':
      default:
        res.redirect('/mutexes/' + req.mutex.uuid());
        break;
      }
    });
  },


  ////////////////////////////////////////////////////////////
  // Helper Methods
  ////////////////////////////////////////////////////////////
  load: function(req, id, fn) {
    var mutex = ActiveMutexes[id];
    if (mutex) {
      fn(null, mutex);
    }
    else {
      switch (req.params.format) {
      case 'json':
        req.res.json(
          {
            'error'   : 'NotFound',
            'message' : 'Sorry. The requested mutex instance does not exist.'
          },
          404
        );
        break;
      case 'html':
      default:
        req.res.send(404);
        break;
      }
    }
  },
});
