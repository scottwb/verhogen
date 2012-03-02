var _ = require('underscore');

var AllTheThings = [
  {
    id   : 1,
    name : "Thing One",
    color: "red"
  },
  {
    id   : 2,
    name : "Thing Two",
    color: "blue"
  },
];

_.extend(exports, {
  
  ////////////////////////////////////////////////////////////
  // RESTful Methods
  ////////////////////////////////////////////////////////////
  index: function(req, res) {
    switch (req.format) {

    case 'json':
      res.json(AllTheThings);
      break;

    case 'html':
    default:
      res.render('things/index', {
        title  : "All The Things",
        things : AllTheThings
      });
    }
  },

  show: function(req, res) {
    switch (req.format) {

    case 'json':
      res.json(req.thing);
      break;

    case 'html':
    default:
      res.render('things/show', {
        title : req.thing.name,
        thing : req.thing
      });
    }
  },
  

  ////////////////////////////////////////////////////////////
  // Member Methods
  ////////////////////////////////////////////////////////////
  foo: function(req, res) {
    var thing = _.clone(req.thing);
    _.extend(thing, {foo:true,bar:false});

    switch (req.format) {

    case 'json':
      res.json(thing);
      break;

    case 'html':
    default:
      res.render('things/foo', {
        title : 'Foo: ' + thing.name,
        thing : thing
      });
    }
  },

  bar: function(req, res) {
    var thing = _.clone(req.thing);
    _.extend(thing, {foo:false,bar:true});

    switch (req.format) {

    case 'json':
      res.json(thing);
      break;

    case 'html':
    default:
      res.render('things/bar', {
        title : 'Bar: ' + thing.name,
        thing : thing
      });
    }
  },
  

  ////////////////////////////////////////////////////////////
  // Helper Methods
  ////////////////////////////////////////////////////////////
  load: function(req, id, fn) {
    var thing = _(AllTheThings).find(function(t) {
      return t.id == req.params.thing;
    });
    fn(null, thing);
  },
});
