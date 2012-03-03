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
      res.json(_.map(ActiveMutexes, function(uuid, mutex) {
        return {
          uuid : mutex.uuid(),
          name : mutex.name()
        };
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
          res.json({id:mutex.uuid()}, 201);
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
      res.json({id : req.mutex.uuid()});
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
    req.mutex.acquire(0, function() {
      switch (req.format) {
      case 'json':
        res.json({'status' : 'acquired'});
        break;
      case 'html':
      default:
        res.redirect('/mutexes/' + req.mutex.uuid());
        break;
      }
    });
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
    fn(null, ActiveMutexes[id]);
  },
});
