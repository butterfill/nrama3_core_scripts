/**
 * for each page_id with notes, each user must create a source.  
 * 
 * where @param persist is made using the persit.js module
 * 
 */

// npm modules (should be listed in package.json)
var $ = require('jquery');
var _ = require('underscore');

// 3rd party non-npm modules
var md5 = require('./lib/md5');
var bibtex = require('./lib/bibtex');

// nrama modules
var settings = require('./settings');
var persist = require('./persist');
var _debug = require('./_debug').debug;


var calculate_id = function calculate_id(o) {
  return 'source_'+md5.b64_hmac_md5(o.user_id, o.page_id);
};
exports.calculate_id = calculate_id;
  
  
/**
 * @param attrs must contain page_id & user_id ; can be note or quote in which case only page_id and user_id are used
 */
var create = function create(attrs) {
  var new_source;
  if( !attrs.type || attrs.type === 'source' ) {
    new_source = $.extend(true, attrs, {});
  } else {
    //@param attrs is a note or quote or some such
    new_source = {
      page_id : attrs.page_id,
      user_id : attrs.user_id,
      url : ( attrs.url ? attrs.url : undefined ),
      page_title : ( attrs.page_title ? attrs.page_title : undefined )
    };
  }
  if( settings.get('is_embedded') ) {
    var defaults = {
      page_title : document.title,
      url : document.location.href
    };
    new_source = $.extend(true, defaults, new_source);
  }
  new_source._id = calculate_id(new_source);  
  new_source.type = 'source';
  return new_source;
};

exports.create = create;
    
/**
 * Create or update a source.
 * @param source must contain (TITLE or page_title), url, page_id
 *      & user_id if update is being called to create a new source
 * Can be called with either a source or a note or a quote
 * Caution: if called with source, source will be modified in place.
 */
var update = function(thing, callback) {
  var source = ( thing.type === 'source' ? thing : create(thing) );
  persist.update(source, callback);
};
exports.update = update;

/** 
 * call update once per source only (but if it fails, will repeat next
 * time it is called)
 * can be called with either a source or a note or a quote 
 */
var _update_memo = [];
var update_once = function(thing, callback) {
  var source_id = ( thing.type === 'source' ? thing._id : thing.source_id );
  var already_done = ( _.indexOf(_update_memo, source_id) !== -1 );
  if( already_done  ) {
    callback(null, 'already done');
    return;
  }
  update(thing, function(error, data){
    if(!error){
      _update_memo.push(source_id);
    }
    callback(error, data);
  });
};
exports.update_once = update_once;


/**
 * This should return an array of strings which canonically represent authors
 * @param authors{string} is the authors.
 * TODO: make this work (see js-bibtex?)
 */
var _parse_authors = function( authors/*String*/ ) {
  _debug({authors:authors});
  return authors.split(' and ');
};

/**
 * quickly attempt to guess whether something is bibtex
 */
// like this: @text { = , }
var _bib_rex = /(^|[^0-9A-Z&\/\?]+)(@)([0-9A-Z_]*[A-Z_]+[a-z0-9_]*)([\s\S]*?{)([\s\S]*?=)([\s\S]*?,)([\s\S]*?})/gi;
var detect_bibtex = function( text ) {
  return !!( text.match(_bib_rex) );
};
exports.detect_bibtex = detect_bibtex;

/**
 * given a string, attempts to parse it as bibtex and update the source
 * with the results.
 * @param thing can be a source, quote or note
 * E.g.
 *   b='@incollection{Baillargeon:1995lu,	Address = {Oxford},	Author = {Baillargeon, Ren{\'e}e and Kotovsky, Laura and Needham, Amy},	Booktitle = {Causal cognition. A multidisciplinary debate},	Date-Added = {2010-08-04 17:40:21 +0100},	Date-Modified = {2010-08-04 17:40:38 +0100},	Editor = {Sperber, Dan and Premack, David},	Pages = {79-115},	Publisher = {Clarendon},	Title = {The Acquisition of Physical Knowledge In Infancy},	Year = {1995}}'
 */
var update_from_bibtex = function(bib_str, thing, callback) {
  var parser = new bibtex.BibtexParser();
  var results;
  try {
    parser.setInput(bib_str);
    parser.bibtex();
    results = parser.getEntries();
  } catch(e) {
    _debug("caught error parsing bibtex",e);
    callback('error parsing bibtex '+e);
    return;
  }
  if( _.size(results) !== 1 ) {
    callback('nrama_sources.parse_bibtex: input contained '+sources._.size(results)+' entries ('+bib_str+')');
    return;
  }
  var entry = _.toArray(results)[0];
  if( entry.AUTHOR ) {
    entry.AUTHOR_TEXT = entry.AUTHOR;
    entry.AUTHOR = _parse_authors(entry.AUTHOR_TEXT);
  }
  entry.bibtex = bib_str;
  var source = create(thing);
  source = $.extend(true, {}, source, entry);
  update(source, callback);
};
exports.update_from_bibtex = update_from_bibtex;
