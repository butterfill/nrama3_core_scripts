/**
 * A function to initialise nrama on a page.
 * 
 * Use like:
 *   var nrama_init = require('./init').nrama_init;
 *   nrama_init(window, document).then(function(){ ... }).catch(function(){ ... })
 */


// npm modules (should be listed in package.json)
var _ = require('underscore');
var $ = require('jquery');    // for $.ajax
var rangy = require('rangy');

// nrama modules
var settings = require('./settings');
var log = require('./log').log;
var _debug = require('./_debug').debug;
var ui = require('./ui');
var quotes = require('./quotes');
var notes = require('./notes');



var _init_events = function(window, document) {
    
  // deal with 403 Forbidden events (session expires, etc)
  $(document).bind('nrama_403', function(e, user_id){
    if( !user_id ) {
      user_id = settings.get('user_id');
    }
    ui.dialogs.login(user_id, 'Please login and re-try.', _debug);
    });
    
    
    // throttle2 is like _.throttle(fn) but this calls fn BEFORE timout
    // TODO: check whether you can now use _.throttle (seems to have been updated)
    var throttle2 = function(func, wait) {
        var timeout;
        return function() {
            var context = this,
                args = arguments;
            var reset_timeout = function() {
                timeout = null;
            };
            if( !timeout ) {
                timeout = setTimeout(reset_timeout, wait);
                func.apply(context, args);
            }
        };
    };
    
    
    // highlighting text creates a quote
    //  TODO : move some of this to quotes module?
    var create_quote_from_selection = function(e){
      if( e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
        //any modifier key cancels quote creation
        return;
      }
      //log("nrama2 caught mouse up");
      var selection = rangy.getSelection();
      if( selection.isCollapsed ) {
          return;
      }
      var range = selection.getRangeAt(0);
      //check that not too much text has been selected (avoid accidental selecting loads of doc)
      if( settings.get('max_quote_length') > 0 ) {
        if( range.toString().length > settings.get('max_quote_length') ){
          log('nrama no quote because too long -- ' + range.toString().length + ' characters selected.');
          return;
        }
      }
      var quote = quotes.create(range);
      if( quote.content !== '' ) {
        quotes.save(quote, function(error, data){
          if( !error ) {
            quotes.display(quote);   //display the quote only after it has been saved
          } else {
            //(todo -- some ui indication that it has failed?
            log("Error saving quote");
            _debug(error);
          }
        });
        _debug((function(){ var a={}; a[quote._id]=quote; return a; })()); 
      }
    };
    $(document).bind("mouseup", throttle2(create_quote_from_selection, settings.get('event_delay')) );
    
    //click a quote to create a note
    var create_note_from_quote_click = function(e){
      if( e.shiftKey || e.ctrlKey ) {
        //shift key cancels notecreation, so does ctrl
        return;
      }
      if( e.altKey || e.metaKey ) {
        //alt key causes quote deletion (in separate handler)
        return;
      }   
      var quote = $(this).data('nrama_quote');
      var note = notes.create(quote);
      notes.display(note);
    };
    $('body').on('click', '._nrama-quote', throttle2(create_note_from_quote_click, settings.get('event_delay')) );
    
    // alt- or meta-click a quote to delete it (after checking there are no linked notes)
    $('body').on('click', '._nrama-quote', function(e){
      if( !e.altKey && !e.metaKey ) {
        // only do stuff if alt or meta key is pressed
        return;
      }
      var quote = $(this).data('nrama_quote');
      var note_ids = notes.find(quote);
      if( note_ids.length === 0 ) {
        quotes.remove(quote);
      } else {
        // quote has note attached
        // don't delete quotes with notes attached ...
        var $quote_nodes = $('.'+quote._id);
        //... instead make the quote have special borders ...
        $quote_nodes.css({'border-top':'1px dashed red',
                         'border-bottom':'1px dashed red'});
        //... and  make the relevant notes bounce ...
        var idstr = '#' + note_ids.join(', #');
        $(idstr).effect('bounce', function(){
          // ... and then make the quote look normal again
          $quote_nodes.css({'border-top':'none',
                            'border-bottom':'none'},500);
        });
      }
    });

    //click on a note to enable editing, bring it to the front and flash the associated quote
    $('body').on('click', '._nrama-note textarea', function(e){
      var $textarea = $(this);
      var $note = $(this).parents('._nrama-note').first();
      notes.bring_to_front($note);
      var note= $note.data('nrama_note');
      quotes.flash(note.quote_id);
    });
    
    //tabbing out of a note doesn't move to next note (because weird).
    //thank you http://stackoverflow.com/questions/1314450/jquery-how-to-capture-the-tab-keypress-within-a-textbox
    $('body').on('keydown', '._nrama-note', function(e){
      if( e.which === 9 ) {
        $('textarea', this).blur();
        e.preventDefault();
      }
    });    
    
  
};

/**
 * returns a string that uniquely identifies the current url
 * (currently this is the url without trailing slash)
 */ 
var get_page_id = function(window) {
  var page_id = window.location.protocol+"//"+window.location.host+window.location.pathname;  //the url with no ?query or #anchor details
  //remove trailing slash
  var last = page_id.length-1;
  if( page_id[last] === '/' ) {
    page_id = page_id.slice(0,last);
  }
  return page_id
}
exports.get_page_id = get_page_id;

var _init = function(window, document){
  return new Promise(function(fulfill, reject){
    
    // -- set page_id
    settings.set('page_id', get_page_id(window));
    
    /**
     * -- set root_node
     * this is the node within which notes and quotes are possible and
     * relative to which their locations are defined.
     * Might eventually be configured per-site
     */
    //root_node = $('#readOverlay')[0]; 
    settings.set('root_node',  document.body);
    
    rangy.init();

    log('nrama version 0.1.3: starting ...');
    
    _init_events(window, document);
    
    /**
     * TODO: this is awkward mix of promises, defer and callbacks
     */ 
    ui.dialogs.login_if_necessary().then(load_notes_and_quotes).then(fulfill).catch(reject);
    
  });
};

/**
 * load notes and quotes for a page.
 * You don't typically need to call this as it is called by the main nrama_init (in _init);
 * if you are going to use it, make sure nrama is already initiated and the user logged in.
 */
var load_notes_and_quotes = function(){
  return new Promise(function(fulfill, reject){
    //_.defer prevents this js blocking the thread (it forces wait until callstack cleared before running)
    _.defer(quotes.load, settings.get('page_id'), function(error, data){
      _.defer(notes.load, settings.get('page_id'), function(error, data){
        if( !error ) {
          return fulfill(data);  //
        } else {
          return reject(error);
        }
      });
    });
  });  
} 
exports.load_notes_and_quotes = load_notes_and_quotes;
    


/**
 * wrap _init so that it runs only when DOM loaded 
 * NB: be careful not to call this twice (currently no safeguards)!
 */
var nrama_init = function(window, document){
  return new Promise(function(fulfill, reject){
    $(document).ready(function(){
      _init(window,document).then(fulfill).catch(reject);
    });
  });
};
exports.nrama_init = nrama_init;