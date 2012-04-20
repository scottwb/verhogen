var _     = require('underscore');
var Mutex = require('../lib/mutex');

// Quick-and-dirty in-memory storage for active Mutex instances so that
// they can maintain their redis connections across requests can be looked
// up by uuid. This is just a scaffold to provide an API for storing them
// that we can fill out more robustly later.
var MutexStore = {
  _instances : {},

  getAll : function() {
    return _.values(this._instances);
  },

  get : function(uuid) {
    return this._instances[uuid];
  },

  put : function(mutex) {
    this._instances[mutex.uuid()] = mutex;
    return mutex;
  },

  remove : function(mutex) {
    delete this._instances[mutex.uuid()];
  }
};

_.extend(exports, {

  ////////////////////////////////////////////////////////////
  // RESTful Methods
  ////////////////////////////////////////////////////////////
  index: function(req, res) {
    activeMutexes = MutexStore.getAll();

    switch (req.format) {
    case 'json':
      res.json(_.map(activeMutexes, function(m) {return m.asJSON();}));
      break;

    case 'html':
    default:
      res.render('mutexes/index', {
        title         : 'Active Mutexes',
        activeMutexes : activeMutexes
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
        MutexStore.put(mutex);
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
    MutexStore.remove(req.mutex);
    req.mutex.destroy();

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
    var mutex = MutexStore.get(id);
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
