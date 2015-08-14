/**
*  functions to get, create and display notes.
*/

// jquery with autogrow plugin
var $ = require('jquery');
var _unused = require('./lib/jquery.autogrow-textarea');
//require('draggable') //error on startup (seems like you can't require it before document loaded!)
require('jquery-ui'); //TODO work out what components I'm actully using (hard to find names of modules; better: remove dependence on jquery-ui altogether)

// 3rd party non-npm modules
var reset_css_on_element = require('./lib/reset_css_on_element');


// nrama modules
var log = require('./log').log;
var _debug = require('./_debug').debug;
var nrama_uuid = require('./nrama_uuid');
var settings = require('./settings');
var persist = require('./persist');
var sources = require('./sources');
var quotes = require('./quotes');


/**
 * Create a new note for a specified quote.
 */
var create = function(quote){
  var new_note = {
    _id : 'n_'+nrama_uuid(),  
    type : 'note',
    content : settings.get('note_default_text'),
    quote_id : quote._id,
    quote_hash : quote.hash,    //can attach to the same quote from other users
    tags : [],                  //will cache the #s to save us parsing text in creating a view
    background_color : settings.get('note_background_color'),
    width : settings.get('note_width'),
    page_id : quote.page_id,  
    created : new Date().getTime(),
    updated : new Date().getTime(),
    user_id : quote.user_id
  };
  new_note.source_id = sources.calculate_id({
    user_id : new_note.user_id,
    page_id : new_note.page_id
  });
  return new_note;
};
exports.create = create;

    
/**
 * extract tags from note
 * losely based on lines 106-7 of https://raw.github.com/bcherry/twitter-text-js/master/twitter-text.js
 */
var _hashtag_regex = /(^|[^0-9A-Z&\/\?]+)(#|＃)([0-9A-Z_]*[A-Z_-]+[a-z0-9_]*)/gi;
get_tags = function(note) {
  var tags = [];
  note.content.replace(_hashtag_regex, function(match, before, hash, hashText) {
    tags.push(hashText);  
  });
  return tags;
};
exports.get_tags = get_tags;
    

save = function(note, options/*optional*/, callback) {
  if( !callback ) {
    callback = options;
    options = {};
  }
  //extract and store the tags
  note.tags = get_tags(note);
  //update the source before saving any quotes
  _debug({msg:'updating source'});
  sources.update_once(note, function(error, data) {
    if( error ) {
      log('error in nrama_notes.save, due to call to nrama_sources.update_once.');
        callback(error, data);
      } else {
        _debug({msg:'saving note'});
        persist.save(note, options, callback);
      }
  });
};
exports.save = save;
   
   
/**
 *  bring a note to the front (used by the ui to bring
 *  a note to the front when editing it)
 */ 
var _zindex_counter = 10000; //used for bringing notes to the front and to ensure new notes are on top
bring_to_front = function($note) {
  $note.css('z-index', _zindex_counter++);  //move note to front
};
exports.bring_to_front = bring_to_front



/**
 * dispaly a note on the page -- i.e. create and style the HTML and add it
 * to the approriate part of the document (the #_nrama_notes).
 * If note does not have position info (either because it is newly created,
 * or because it was created on the server), attempt to position it near the quote.
 */
var display = function(note, options) {
  var options_defaults = {
    focus : true        //set focus to the note's textarea after creating it?
  };
  var display_settings = $.extend(true, {}, options_defaults, options );
    
  // --- apply some positioning defaults to notes
  var note_defaults = {};
  var viewport_width = $(window).width();
  //shift quotes horizontally by 1/30 of viewport_width
  var random_shift = function(){ return Math.floor(Math.random()*(viewport_width/30)); };
  var note_right_gap = Math.min(15, viewport_width/65);
  note_defaults.left = viewport_width - note_right_gap - (note.width || settings.get('note_width')) - random_shift();
  //to get default for top we need position of associated quote --- only compute this if we really need it
  if( !note.top ) {
    var quote_offset = null;
    if( note.quote_id && quotes ) {
      quote_offset = quotes.offset(note.quote_id);    //may return null if can't be computed
    }
    if( quote_offset ) {
      note_defaults.top = quote_offset.top + random_shift();
    } else {
      note_defaults.top = 0 + random_shift(); //put note at top of screen if can't do better
      log("nrama unable to get default position for note " + note._id + " because no quote offset found for quote " + note.quote_id + "(has the quote been added to the page?)");
    }
  } 
  note = $.extend(true, {}, note_defaults, note );
    
  // -- check the note container div exists, append to document.body if not
  if( $('#_nrama_notes').length === 0 ) {
    $('<div id="_nrama_notes"></div>').appendTo('body').
      css({position:"absolute", left:"0px", top:"0px",width:"0%", height:"0%"});
  }

  // --- start properly here
  if( $('#'+note._id).length !== 0 ) {  
    undisplay(note); //If note already displayed, undisplay it first.
  }
  var pos_attrs = {
    "position":"absolute",
    "left":note.left+"px",
    "top":note.top+"px"
  };
  var textarea = $('<textarea></textarea>').
                    val(note.content).
                    css(settings.get('note_editor_style')).
                    one('blur', _update_on_blur).  //make sure edits are saved
                    autogrow();
  var inner_div = $('<div></div>').
                    css(settings.get('note_inner_style')).
                    append(textarea);
  var $edit_note = $('<div></div');
  reset_css_on_element($edit_note);
  // new Draggable($edit_note, {setCursor:true,onDragEnd:_update_on_drag}); //for the draggable module (which doesn't actully work, alas)
  $edit_note.attr('id',note._id).
    addClass('_nrama-note').
    css(pos_attrs).
    css(settings.get('note_style')).
    css('z-index',_zindex_counter++).
    css('background-color', note.background_color || settings.get('note_background_color')).
    data('nrama_note',note).
    append(inner_div).
    appendTo('#_nrama_notes').
    draggable({ cursor:'move', opacity:0.66, stop:_update_on_drag }).
    hide().show("scale",{},200, function(){
      if( display_settings.focus ) {
        textarea.focus().select();
      }
    });
};
exports.display = display;

    
/**
 * remove HTML node represening note from the page
 */
var undisplay = function(note) {
  $('#'+note._id).remove();
};
exports.undisplay = undisplay;

// -- call this to re-enable note when error saving or deleting
var _finally = function _finally($note, restore_background ){
  var $textarea = $('textarea', $note);
  //make changes to textarea possible & ensure they trigger updates
  $textarea.removeAttr("disabled");
  $textarea.unbind('blur', _update_on_blur).one('blur', _update_on_blur);  //make sure edits are saved
  if( restore_background ) {
    $textarea.parents('._nrama-note').css({backgroundColor:settings.get('note_background_color')});
  }
};


/**
 * event handler for blur event on TEXTAREA of $note
 * This handles display, logic & persistence.
 * if & when successfully persisted, the note is stored as a jquery.data attr
 * on the $note (key:nrama_note)
 */
var _update_on_blur = function(e) {
  var $textarea = $(this);
  $textarea.unbind('blur', _update_on_blur).
    attr("disabled", "disabled");   //disable text area while attempting to persist
  $note = $textarea.parents('._nrama-note').first();
  $note.css('background-color', settings.get('persist_started_color'));
  
  // -- delete note if note content is empty
  var new_content = $textarea.val();
  if( $.trim(new_content) === '' ) {
    log("nrama_notes.update -- deleting note "+$note.attr('id'));
    remove($note); 
    return;
  }
  
  var note = $note.data('nrama_note');
  
  // -- if content unchanged, do nothing (so moving a note won't trigger a change)
  var old_content = note.content;
  if( old_content === new_content ) {
    _finally($note, true);
    return;
  }

  var updates = {
    content : new_content,
    updated : new Date().getTime()
  };
  if( settings.get('is_embedded') ) {
    $.extend(updates, {
      background_color : settings.get('note_background_color'),
      left : $note.offset().left,
      top : $note.offset().top,
      doc_height : $(document).height(),
      doc_width : $(document).width()
    });
  }
  var new_note = $.extend(true, {}, note, updates);   
  
  save(new_note, {clone_on_conflict:true}, function(error,data){
    if( error ) {
      $note.css({backgroundColor : settings.get('persist_failed_color')});
      _finally($note, false);
    } else {
      //log("nrama_notes._update_on_blur: was persisted note _id:"+new_note._id+" for quote:"+new_note.quote_id);
      $note.attr('id',new_note._id); //may have changed (save can clone)
      $note = $('#'+new_note._id);   //have to update after changing id attribute
      $note.data('nrama_note', new_note);
      //check for bibtex (do this after save to avoid conflicts)
      if( sources.detect_bibtex(new_note.content) ) {
        sources.update_from_bibtex(new_note.content, new_note, function(error, data){
          if( !error ) {
            $('#'+note._id).css({border:'1px solid #01DF01'});
          }
          _finally( $note, true );
        });
      } else {
        _finally( $note, true );
      }
    }
  });
};
    
var _update_on_drag = function(e) {
  var $textarea = $('textarea', $(this) ).first();
  if( $textarea.attr('disabled') ) {
    log('nrama_notes._update_on_drag: save currently in progress');
    return;
  }
  log("nrama_notes._update_on_drag starting");
  $textarea.attr('disabled','disabled');
  var $note =  $(this);
  var note = $note.data('nrama_note');
  var updates = {
    left : $note.offset().left,
    top : $note.offset().top,
    doc_height : $(document).height(),
    doc_width : $(document).width()
  };
  note = $.extend(true, note, updates);   
  save(note, {clone_on_conflict:false}, function(error, data){
    //errors are ignored -- note location not critical
    $textarea.removeAttr('disabled');
  });
};

/**
 * request delete from server & remove from document if succeeds
 */
var remove = function($note) {
  var note_id = $note.attr('id');
  $note.css('background-color','red');
  var note = $note.data('nrama_note');
  persist.rm(note, function(error, data){
    if( error ) {
      _finally($note, false);
    } else {
      log("nrama_notes.remove deleted note "+note_id+" from server.");
      $('#'+note_id).hide('puff',{},300+Math.floor(Math.random()*600), function(){
        $('#'+note_id).remove();
      });
    }
  });
};
exports.remove = remove;

/**
 * load notes from server and display on this page
 * run after quotes have been loaded and displayed in case notes need positioning
 */
var load = function(page_id, callback) {
  var user_id = settings.get('me_only') ? settings.get('user_id') : undefined;
  persist.load({
    page_id : page_id,
    type : 'note',
    user_id : user_id
  }, function(error, data){
    if( error ) {
      _debug({msg:'nrama_notes.load error:', error:error});
      callback(error, data);
      return;
    }
    log('nrama_notes.load got ' + ( data ? (data.rows ? data.rows.length : 0 ) : 0) + ' notes from server for user '+user_id);
    if( data && data.rows ) {
      $.each(data.rows, function(index,row){
        var note = row.value;
        display(note, {focus:false});
      });
    }
    callback(error, data);
  });
};
exports.load = load;
    
/**
 * @returns _ids of notes if @param quote has notes attached
 */
var find = function(quote) {
  var _ids = [];
  $('._nrama-note').each(function(){
    var rel_quote_id = $(this).data('nrama_note').quote_id;
    if( rel_quote_id === quote._id ) {
      _ids.push($(this).attr('id'));  //add _id of the note to the list
    }
  });
  return _ids;
};
exports.find = find;