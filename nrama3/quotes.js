/**
 * note-o-rama quote functions
 *
 */


// npm modules (should be listed in package.json)
var $ = require('jquery');
var rangy = require('rangy');
var _unused = require('./lib/rangy-classapplier');  //rangy module for rangy.createClassApplier

// 3rd party non-npm modules
var md5 = require('./lib/md5');

// nrama modules
var log = require('./log').log;
var _debug = require('./_debug').debug;
var nrama_uuid = require('./nrama_uuid');
var settings = require('./settings');
var persist = require('./persist');
var sources = require('./sources');
var serializers = require('./serializers');



/**
 * @returns a hash for determining whether two quotes are the same
 *     across different users.
 */
var calculate_hash = function(quote) {
  var hash = md5.b64_hmac_md5(quote.page_id, quote.content);
  return hash;
};
exports.calculate_hash = calculate_hash;  



/**
 * @param range{Rangy}
 * @returns an array representing the order this quote probably appears
 * on the page.  Assumes that earlier in DOM means earlier on screen.
 * (the alternative would be to use height, but that fails for columns
 * & varying height)
 */
var calculate_page_order = function calculate_page_order(range) {
  var doc_height = $(settings.root_node).height();
  var doc_width = $(settings.root_node).width();
  //todo
  var node = range.startContainer;
  var page_order = [range.startOffset];   //create in reverse order, will reverse it
  while ( node && node !== document.body ) {
    page_order.push(rangy.dom.getNodeIndex(node, true));
    node = node.parentNode;
  }
  page_order.reverse();
  return page_order;
};
exports.calculate_page_order = calculate_page_order; 



/**
* @param range is a Rangy range object
*/
var create = function(range) {
  var new_quote = {
    _id : 'q_'+nrama_uuid(),  
    type : 'quote',
    content : $.trim( range.toString() ),
    background_color : settings.get('background_color'),
    url : document.location.href,
    page_id : settings.get('page_id'),  
    page_title : document.title,
    //the xpointer to the quote (well, it isn't actually an xpointer but  any serialized representation of the range)
    xptr : serializers.current.serialize(range),
    //the name of the method used to seralise
    xptr_method : serializers.current.id,
    page_order : calculate_page_order(range),
    created : new Date().getTime(),
    updated : new Date().getTime(),
    user_id : settings.get('user_id')
  };
  new_quote.hash = calculate_hash(new_quote);
  new_quote.source_id = sources.calculate_id({
      user_id : new_quote.user_id,
      page_id : new_quote.page_id
  });
  return new_quote;
};
exports.create = create;

var save = function(quote, options/*optional*/, callback) {
  if( !callback ) {
    callback = options;
    options = {};
  }
  //update the source before saving any quotes
  sources.update_once(quote, function(error, data) {
    if( error ) {
      log('error in nrama_quotes.save is due to call to sources.update_once.');
      callback(error, data);
      return;
    }
    persist.save(quote, options, callback);
  });
};
exports.save = save;
   

/**
 * @returns the range for the specified quote or null if not possible.
 * caution: this may fail once the quote has been highlighted!
 */
var get_range = function(quote) {
  var method = quote.xptr_method || '_method_unspecified'; //method for recovering the range from the quote
  if( !(serializers.hasOwnProperty(method)) ) {
    log('unknown xptr_method ('+method+') for quote '+quote._id);
    return null;
  }
  try {
    var serializer = serializers[method];
    return serializer.deserialize(quote.xptr);
  } catch(error) {
    log('nrama_quotes.display FAIL with range = '+quote.xptr+'\n\t for quote '+quote._id);
    _debug(error);
    return null;
  }
};
exports.get_range = get_range;



/**
 * attempt to highlight quote into the HTML document.  May fail if range
 * cannot be decoded; fails silently.  Nodes added to the DOM will have the
 * quote object stored with jQuery.data (key:'nrama_quote')
 *
 * Checks that quote not already on page; will not re-display if it is.
 *
 * depends Rangy + its highlight module
 *
 * @returns true if successful (or quote already displayed), false otherwise
 */
var display = function(quote) {
  if( $('.'+quote._id).length !== 0 ) {
    return true;  //quote already displayed
  }
  var range = get_range(quote);
  if( !range ) {
    return false;
  }
  var _rangy_highlighter = rangy.createClassApplier(quote._id,{ignoreWhiteSpace:false});
  try{
    _rangy_highlighter.applyToRange(range);
    $('.'+quote._id).addClass('_nrama-quote');
  } catch(error) { //seems to be rare
    log("nrama: error using Rangy's createClassApplier.applyToRange, re-throwing");
    _debug(error);  
    return false;   //silently fail
  }
  $('.'+quote._id).css('background-color',quote.background_color).data('nrama_quote',quote);
  return true;
};
exports.display = display;

/**
 * remove a quote's highlights from the HTML document.
 * leaves jQuery.data('nrama_quote') and _id as class intact, so quote can
 *   still be found (todo: not sure this is a good idea!).
 * todo -- this would ideally remove the elements so that subsequent quotes
 *  had more reliable xpointers (as long as we don't have a way of getting
 *  good xpointers).
 */
var undisplay = function(quote) {
  $('.'+quote._id).
    removeClass('_nrama-quote').
    css({'border-top':'none', 'border-bottom':'none', 'box-shadow':'none'}).
    //removeClass(quote._id). //not sure whether I want to do this yet
    css('background-color','red').
    animate({'background-color':'black'}, function(){
      $(this).css('background-color','inherit');
    });
};
exports.undisplay = undisplay;
        
var flash = function(quote_id) {
  var $quote_nodes = $('.'+quote_id);
  $quote_nodes.css({'border-top':'1px dashed black',
                    'border-bottom':'1px dashed black',
                    'box-shadow':'0 0 20px' + settings.background_color });
  window.setTimeout(function(){
    $quote_nodes.css({'border-top':'none', 'border-bottom':'none', 'box-shadow':'none'});            
  },600);
};
exports.flash = flash;
        
/**
 * request quote delete from server and remove from page if successful
 */
var remove = function(quote) {
  $('.'+quote._id).css('background-color','orange');
  persist.rm(quote, function(error, data){
    if( !error ) {
      undisplay(quote);
    }
  });
};
exports.remove = remove;
    
/**
 * load quotes from server and display on this page
 */
var load = function(page_id, callback) {
  var user_id = settings.get('me_only') ? settings.get('user_id') : undefined;
  persist.load({
    page_id : page_id,
    type : 'quote',
    user_id : user_id
  }, function(error, data){
    if( !error && data ) {
      log('nrama_quotes.load got ' + ( data.rows ? data.rows.length : 0 ) + ' quotes from server for user '+user_id);
      //need to sort quotes by the time they were added to page for best chance of displaying them
      var _sorter = function(a,b){ return a.value.created - b.value.created; };
      data.rows.sort(_sorter);
      var _failing_quotes = [];
      $.each(data.rows, function(index, row){
        var quote = row.value;
        var success = display(quote);  //this won't re-display quotes already present
        if( !success ) {
          _failing_quotes.push(quote._id);
        }
      });
      if( _failing_quotes.length > 0 ) {
        log('failed to display '+_failing_quotes.length+' quotes, _ids: '+_failing_quotes.join('\n\t'));
      }
    }
    callback(error, data);
 });
};
exports.load = load;
        
/**
 * @returns a quote object (or null if not found)
 */
var get_from_page = function(quote_id) {
  return $('.'+quote_id).first().data('nrama_quote') || null;
};
exports.get_from_page = get_from_page;
        

/**
 * calculate the offset (.top, .left) of a quote
 * This is used in notes to display notes in a good position relative to quotes
 */
var offset = function(quote_id) {
  return $('.'+quote_id).first().offset();
};
exports.offset = offset;