/**
 * Rails-like UJS scripting for node.js
 *
 * Heavily borrowed/inspired by jquery-ujs:
 *   https://github.com/rails/jquery-ujs
 *
 */

(function($) {
  // Shorthand to make it a little easier to call public ujs functions
  // from within ujs.js.
  var ujs;

  $.ujs = ujs = {
    linkClickSelector: 'a[data-confirm], a[data-method]',

    // Triggers an event on an element and returns false if the event
    // result is false.
    fire: function(obj, name, data) {
      var event = $.Event(name);
      obj.trigger(event, data);
      return event.result != false;
    },

    // Handles "data-method" on links such as:
    // <a href="/users/5" data-method="delete" rel="nofollow" data-confirm="Are you sure?">Delete</a>
    handleMethod: function(link) {
      var href       = link.attr('href');
      var method     = link.data('method');
      var ajax       = link.data('ajax');
      var csrf_token = $('meta[name=csrf-token]').attr('content');
      var csrf_param = $('meta[name=csrf-param]').attr('content');
      var form       = $('<form method="post" action="' + href + '"></form>');
      var inputs     = '<input name="_method" value="' + method + '" type="hidden" />';

      if (csrf_param !== undefined && csrf_token !== undefined) {
        inputs += '<input name="' + csrf_param + '" value="' + csrf_token + '" type="hidden"/>';
      }
      
      if (ajax !== undefined) {
        // Can't do this via form.data() because of the way jQuery Mobile
        // reads the data-ajax attribute from the form.
        form.attr('data-ajax', ajax);
      }

      form.hide().append(inputs).appendTo('body');
      form.submit();
    },

    // If message provided in 'data-confirm' attribute, fires `confirm` event
    // and returns result of confirm dialog.
    // Attaching a handler to the element's `confirm` event that returns
    // false cancels the confirm dialog.
    allowAction: function(element) {
      var message = element.data('confirm');
      return !message || (ujs.fire(element, 'confirm') && confirm(message));
    },

    // Helper function, needed to provide consistent behavior in IE
    stopEverything: function(e) {
      e.stopImmediatePropagation();
      return false;
    }
  };

  $(ujs.linkClickSelector).live('click.ujs', function(e) {
    try {
      var link = $(this);
      if (!ujs.allowAction(link)) {
        return ujs.stopEverything(e);
      }

      if (link.data('method')) {
        ujs.handleMethod(link);
        return false;
      }

      alert('wait');
      return false;
    }
    catch (e) {
      alert(e.message);
    }
  });

})(jQuery);
