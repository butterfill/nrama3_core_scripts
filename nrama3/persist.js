/**
 * This module handles nrama persistence.
 * Thin wrapper around nrama's db module.
 *
 * This module doesn't know anything about sessions or logins:
 * the db passed to make_persist should be able to handle 
 * situations where a login is required.
 */

// npm modules (should be listed in package.json)
var $ = require('jquery');

// 3rd party non-npm modules
var nrama_uuid = require('./nrama_uuid');

// nrama modules
var settings = require('./settings');
var log = require('./log').log;
var _debug = require('./_debug').debug;
var db = require('./db');



//log errors (used to wrap callbacks from db & session)
var _debug_wrap = function(name, callback) {
  return function(error, data){
    if( error ) {
      _debug({msg:'nrama_'+name+': error',error:error});
    }
    callback(error, data);
  };
};


/**
 * @param db{Object} implements (a subset of) kanso's db module:
    db.put
    db.doUpdate
    db.remove
    db.getView

 */
  
/**
 * save a note or a quote (or anything that JSON.stringify will work on, really).
 * NB: If successful, will update a _rev property on thing and insert _id
 * NB: if options.clone_on_conflict, @param thing will have its properties updated  incl. new _id
 */
var save = function(thing, options/*optional*/, callback/*required*/ ) {
  if( !callback ) {
    callback = options;
    options = {};
  }
  var defaults = {
    clone_on_conflict : false   //e.g. set to true used when saving notes
  };
  var save_settings = $.extend(true, {}, defaults, options);
      
  //add nrama_version if not present
  if( !thing.nrama_version ) {
    thing.nrama_version = settings.get('nrama_version');
  }
  
  db.put(thing).then(function(data){
    thing._rev = data.rev;
    callback(null, data);
  }).catch(function(error){
    if( save_settings.clone_on_conflict ) {
      if( error.status === 409 || error.error === "conflict")  {
        log('nrama_persist.save: conflict on save for '+(thing.type || '')+' '+thing._id+' --- started cloning');
        _clone(thing, callback);
        return;
      }
    }
    _debug({msg:'nrama_persist.save: error.message = ' + (error.message || '[none]'),error:error});
    callback(error, null);
  });
};
exports.save = save;
        
/**
 * create and persist a clone of a note or quote, updating the
 * passed thing in place.
 */
var _clone = function(thing, callback) {
  var new_id = nrama_uuid();
  var updates = {
    _id : new_id,
    replaces_id : thing._id 
  };
  var cloned_thing = $.extend(true, {}, thing, updates); 
  delete cloned_thing._rev;  //revision is no longer valid
  save(cloned_thing, function(error, data){
    if( !error ) {
      thing = cloned_thing;   //messy
    }
    callback(error,data);   
  });
};


/**
 * assumes that thing.type (e.g. 'source') is the name of the couchdb update function
 * thing must have .type and ._id and ._rev attributes 
 */
var update = function(thing, callback) {
  _debug({msg:'thing.type = '+thing.type+' for thing._id='+thing._id});
  db.doUpdate( thing, encodeURIComponent( thing.type ), _debug_wrap('persist.update', callback) );
};
exports.update = update;

/**
 * deletes a quote or note from the server providing it has a '_rev' property.
 * if no _rev property, nothing happens but this is callback'ed as success.
 *  (we exploit this -- absence of _rev means it's not been persisted)
 */
var rm = function(thing, callback) {
  if( !thing._rev ) {
    callback(null, { deleted:false, message:'nrama_persist.rm did not delete because '+(thing.type ||'')+' '+(thing._id || '')+' has no _rev'});
  }
  db.remove(thing).then(function(res){
    _debug_wrap('persist.rm',callback)(null, res);
  }).catch(function(err){
    _debug_wrap('persist.rm',callback)(err,null);
  });
};
exports.rm = rm;
        
/**
 * loads data for a page (e.g. all quotes)
 * @param options.page_id is the page to load stuff for (required)
 * @param options.type{String} specifies which type of objects to load (required)
 * @param options.user_id{String} [optional] omit if loading for all users
 */
var load = function(options, callback) {
  var defaults = {
    page_id : undefined, 
    type : null, 
    user_id : null,
    success : null, 
    error : null
  };
  var load_settings = $.extend({}, defaults, options);
      
  var query;
  if( !load_settings.type ) {
    query = {
      startkey:'["'+load_settings.page_id+'"]', 
      endkey:'["'+load_settings.page_id+'",{}]'
    };
  } else { 
    //type is specified
    if( !load_settings.user_id ) {
      query = {
        startkey:'["'+load_settings.page_id+'","'+load_settings.type+'"]',
        endkey:'["'+load_settings.page_id+'","'+load_settings.type+'",{}]'
      };
    } else {    
      //type and user_id are specified
      query = {key:'["'+load_settings.page_id+'","'+load_settings.type+'","'+load_settings.user_id+'"]' };
    }
  }
  db.getView('pageId_type_userId', query, _debug_wrap('persist.load',callback));
};
exports.load = load;