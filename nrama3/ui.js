/**
 * This module can create dialogs and things:
 *
 */

// npm modules (should be listed in package.json)
var _ = require('underscore');    
var $ = require('jquery');    

// 3rd party non-npm modules
var _unused = require('./lib/jquery.simplemodal');    //jquery extension for the modal dialog
var reset_css_on_element = require('./lib/reset_css_on_element');


// nrama modules
var settings = require('./settings');
var db = require('./db');
var log = require('./log').log;

dialogs = {};

/**
 * switch user_id if logged in; otherwise check whether configured for
 * anonymous user and request user to log in if not.
 */
dialogs.login_if_necessary = function(){
  // try db.login first to avoid potentially unnecessary user dialog
  return new Promise(function(fulfill, reject){
    var user_id = settings.get('user_id');
    if( user_id && user_id[0] === '*' ) {
      //anonymous -- login not required
      fulfill({message:'anonymous user, login not required'});
      return;
    }
    db.login().then(fulfill).catch(function(){
      // not logged in: create a ui dialog to log in
      dialogs.login().then(fulfill).catch(function(err){
        log('Error logging in ...');
        log(err);
        reject(err);
      });
    });
    
  });
}


/**
 * dispaly a login dialog, returns a promise that is fulfilled when user logged in.
 * will also attempt to db.login if values provided and user requests login
 * @param msg is an optional message to display to the user.
 */
dialogs.login = function(msg/*optional*/) {
  return new Promise(function(fulfill, reject){
    // - promise is fulfilled or rejected in the event handlers for a ui dialog

    if( !msg ) { msg = ''; }
    var username = settings.get('user_id');

    // - make dialog HTML
    var $div = $('<div><h2><a href="http://www.note-o-rama.com" target="_blank">Note-o-rama</a> : login</h2></div>');
    $div.append('<form id="login_form" action="/_session" method="POST">' +
      '<div class="general_errors">'+msg+'</div>' +
      '<div class="username field">' +
        '<label for="id_name">Username</label>' +
        '<input id="id_name" name="name" type="text" />' +
        '<div class="errors">&nbsp;</div>' +
      '</div>' +
      '<div class="password field">' +
        '<label for="id_password">Password</label>' +
        '<input id="id_password" name="password" type="password" />' +
        '<div class="errors">&nbsp;</div>' +
      '</div>' +
      '<div class="actions">' +
        '<input type="button" id="id_cancel" value="Cancel" />' +
        '<input type="submit" id="id_login" value="Login" />' +
      '</div>' +
    '</form>');
    reset_css_on_element($div);
    
    // - update dialog HTML with values
    $('.general_errors, .errors', $div).css({color:'red'});
    $('#id_name',$div).val(username);
    
    // - attach event handlers to dialog HTML 
    $('#id_cancel', $div).click(function () {
      $.modal.close();
      reject({message:'you cancelled'});
    });
    $('form', $div).submit(function (ev) {
      ev.preventDefault();
      var username = $('input[name="name"]', $div).val();
      var password = $('input[name="password"]', $div).val();
      $('.username .errors', $div).text(
        username ? '': 'Please enter a username'
      );
      $('.password .errors', $div).text(
        password ? '': 'Please enter a password'
      );
      if (username && password) {
        settings.set('user_id',username);
        settings.set('password',password);
        db.login().then(function(data){
          $($div).fadeOut('slow', function () {
            $.modal.close();
            fulfill(data);
          });
        }).catch(function(error){
          error_msg = error.message || error.msg || "Error "+(error.status || '')+" logging in (network connection?)";
          $('.general_errors', $div).text(error_msg);
        });
      }
    });
    
    // - display the dialog (and shift focus if useful)
    $div.modal(settings.get('simplemodal'));
    _.delay( function(){
      $('#simplemodal-container').css({'width':'auto', 'height':'auto'});
      if( username ) {
        $('#id_password').focus();
      }
    }, 50 );
  });
};



exports.dialogs = dialogs;