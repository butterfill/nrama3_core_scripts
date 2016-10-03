/**
 * This module can create and maintain a connection to a couchDB database 
 * and provides
 * these functions for accessing it:
 *
 *    db.put(doc) returns a Promise  //works like pouchDB
 *    db.remove(doc)                 //works like pouchDB
 *
 *    db.getView
 *    db.doUpdate
 *
 * the db connected to is specified by the URL in nrama's settings module
 * 
 * some of the code is borrowed from kan.so
 * 
 * use like:
 *  require('./db');
 *  db.connect(); //not strictly necessary -- will attempt to connect as necessary
 *  db.put(doc).then(function(data){});
 *
 * TODO: this is really a mess because uses pouchdb for some but not all,
 * and even requires multiple ajax methods for getView and doUpdate (to deal with
 * authentification, not sure why)!
 */



// npm modules (should be listed in package.json)
var $ = require('jquery');    // for $.ajax and events
var pouchdb = require('pouchdb');
pouchdb.plugin(require('pouchdb-authentication'));
var ajax = require('pouchdb/extras/ajax');

// nrama modules
var settings = require('./settings');
var log = require('./log').log;
var _debug = require('./_debug').debug;

var _db = null;
// testing only! do not use in application!
exports._get_db = function(){
  return _db;
}
var _info = null;
var _connected = false;

var is_connected = function(){
  return _connected;
}
exports.is_connected = is_connected;


var reset_connection = function(){
  _db = null;
  _info = null;
  _connected = false;
}
exports.reset_connection = reset_connection;

/**
 *  check connected by performing an operation.  returns a Promise.
 *  If not connected, the promise is rejected; if connected, its fulfilled.
 *  Updates the internal state of the module.
 */
var check_connected = function(fast_check) {
  return new Promise(function(fulfill, reject){
    if( !_db ) {
      _connected = false;
      reject(new Error("Not connected"));
    }
    if( fast_check ) {
      if( _info && _connected ) {
        fulfill(_info);
      } else {
        reject(new Error("Not connected"));
      }
    } else{
      // slow check -- actually attempt to connect to db to verify connection
      _db.info().then(function(info){
        _connected = true;
        _info = info;
        fulfill(info);
      }).catch(function(error){
        _connected = false;
        reject(new Error("Not connected"));
      });
    }
    
  });
  
}
exports.check_connected = check_connected;



/**
 * returns a Promise with info about the db if successful.
 * can be called repeatedly --- will not re-connect if already connected
 * WARNING: fast_check is not true, then if already connected, 
 *    will issue a https request to check connected
 *    before reporting back. 
 */
var connect = function(fast_check) {
  return new Promise(function(fulfill, reject){
    
    // don't want to connect if we're already connected
    check_connected(fast_check).then(function(info){
      // ok, we're already connected -- nothing to do
      fulfill(info);
    }).catch(function(err){
      
      // not connected; attempt to connected:
      _db = new pouchdb(settings.get('db_url'));
    
      // check it's actually connected before reporting back
      check_connected().then(function(info){
        fulfill(info);
      }).catch(function(err){
        reject(err);
      });
      
    });
    
  });
}
exports.connect = connect;

/**
 *  we wrap put so that it connects before attempting to put
 */
var put = function(doc){
  return new Promise(function(fulfill, reject){
    connect(true).then(function(_ignore){
      _db.put(doc).then(function(res){
        fulfill(res);
      }).catch(function(err){
        // error putting
        reject(err);
      });
    }).catch(function(err){
      // error connecting
      reject(new Error("could not put because error connecting: "+( err.message || '[no messsage]')));
    });
  });
}
exports.put = put;

/**
 *  we wrap put so that it connects before attempting to put
 */
var remove = function(doc){
  return new Promise(function(fulfill, reject){
    connect(true).then(function(_ignore){
      _db.remove(doc).then(function(res){
        fulfill(res);
      }).catch(function(err){
        // error removing
        reject(err);
      });
    }).catch(function(err){
      // error connecting
      reject(new Error("could not remove because error connecting: "+( err.message || '[no messsage]')));
    });
  });
}
exports.remove = remove;


//todo: wrap requiring connection? return promise!
var login = function(username, password){
  return new Promise(function(fulfill, reject){
    var username = settings.get('user_id');
    var password = settings.get('password');
    if( !username || username === '' || !password || password === '') {
      reject({msg:'cannot login because username or password not set'});
    } else {
      connect(true).then(function(){
        return new Promise(function(fulfill, reject){
          _db.login(username,password,function (err, response) {
            if (!err) {
              log('success logging in');
              fulfill(response);
            } else {
              //error
              if (err.name === 'unauthorized') {
                // name or password incorrect
                reject(err);
              } else {
                // unsure what the error is
                log('unknown error in login: '+err);
                _debug(err);
                throw new Error('unknown error in login: '+err);
              } 
            } 
          });
        });
      }).then(fulfill).catch(reject);
    }
  });
};
exports.login = login;  





// -----
// methods that aren't provided by pouchDB
// -----

var _request = function (options, callback, which_ajax) {
  options.complete = onComplete(options, callback);
  options.dataType = 'json';
  console.log(options);
  if( typeof(which_ajax) === 'undefined' || which_ajax === 'jquery' ) {
    $.ajax(options, callback);
  } else {
    ajax(options, callback);
  }
};

/**
 * Returns a function for handling ajax responsed from jquery and calls
 * the callback with the data or appropriate error.
 *
 * @param {Function} callback
 * @api private
 */
var onComplete = function(options, callback) {
  return function (req) {
    // console.log('Returned status code: ' + req.status);
    // window.req=req;
    var ctype = req.getResponseHeader('Content-Type');
    if (ctype !== 'application/json' && ctype !== 'text/json' && options.expect_json) {
      return callback(
        new Error('Expected JSON response, got ' + ctype)
      );
    }
    var resp = req.responseText;
    if( req.responseJSON ) {
      resp = req.responseJSON;
    }
    if (req.status === 401) {
      // returned 'Unauthorized': TODO check the user's session if it's not
      // been checked on an 'Unauthorized' repsonse in the last second
      // -- deleted this -- should probably use it to flag a login and repeat
      // if (session && last_session_check < new Date().getTime() - 1000) {
      //   session.info();
      // }
      return callback(new Error('error in nrama.db.onComplete --- 401 unauthorized (login again?)'));
    }
    if (req.status === 200 || req.status === 201 || req.status === 202) {
      return callback(null, resp);
    } 
    if( req.status === 403 ) {
      if( typeof(document) !== 'undefined' ) {
        $(document).trigger('nrama_403', settings.get('user_id'));
      }
      return callback(new Error('error in nrama.db.onComplete --- 403 forbidden (login needed?)'));
    }
    if(resp.error) {
      var err = new Error(resp.reason || resp.error);
      err.error = resp.error;
      err.reason = resp.reason;
      err.status = req.status;
      return callback(err);
    }
    // TODO: map status code to meaningful error message
    return callback(new Error('Returned status code: ' + req.status));
  };
};

/**
 * returns the base url to use for nrama
 */
var _getBaseURL = function() {
  return settings.get('db_url') + settings.get('db_url_base');
}

/**
 * Encodes a document id or view, list or show name.
 *
 * @name encode(str)
 * @param {String} str
 * @returns {String}
 * @api public
 */
var _encode = function (str) {
  return encodeURIComponent(str).replace(/^_design%2F/, '_design/');
};


/**
 * Properly encodes query parameters to CouchDB views etc. Handle complex
 * keys and other non-string parameters by passing through JSON.stringify.
 * Returns a shallow-copied clone of the original query after complex values
 * have been stringified.
 *
 * @name stringifyQuery(query)
 * @param {Object} query
 * @returns {Object}
 * @api public
 */

var stringifyQuery = function (query) {
  var q = {};
  for (var k in query) {
    if (typeof query[k] !== 'string') {
      q[k] = JSON.stringify(query[k]);
    }
    else {
      q[k] = query[k];
    }
  }
  return q;
};



// *TODO : the following should be wrapped so as to call connect if necessary.

/**
 *  TODO: not a complete implementation --- assumes
 *  that doc already has _id property (I think the couchdb API allows for
 *  pushes w/o id set)
 *
 */
var doUpdate = function( doc, update_name, callback ) {
  var url =  _getBaseURL() + '/_rewrite/update/' + update_name +'/' + _encode( doc._id );
  var req = {
    type: 'PUT',
    url: url,
    //data: JSON.stringify(doc),
    body: JSON.stringify(doc),
    processData: false,
    contentType: 'application/json',
    method : 'POST',
    expect_json:false               //as of couchdb 1.1.0, updates seem to defy attempts to alter headers & return text/html header.
    };
  _request(req, callback, 'pouchdb');
};
exports.doUpdate = doUpdate;


// Convert a options object to an url query string.
  // ex: {key:'value',key2:'value2'} becomes '?key="value"&key2="value2"'
var _encodeOptions = function(options) {
  var buf = [];
  if (typeof(options) == "object" && options !== null) {
    for (var name in options) {
      if (!options.hasOwnProperty(name)) { continue; };
      var value = options[name];
      if (name == "key" || name == "keys" || name == "startkey" || name == "endkey" || (name == "open_revs" && value !== "all")) {
        value = toJSON(value);
      }
      buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
    }
  }
  if (!buf.length) {
    return "";
  }
  return "?" + buf.join("&");
}
function toJSON(obj) {
    return obj !== null ? JSON.stringify(obj) : null;
  }
  
/**
 * Fetches a view from the database the app is running on. Results are
 * passed to the callback, with the first argument of the callback reserved
 * for any exceptions that occurred (node.js style).
 *
 * @name getView(view, q, callback)
 * @param {String} view
 * @param {Object} q 
 * @param {Function} callback
 * @api public
 *
 * sample URL
 *    http://localhost:5984/nrama/_design/nrama/_rewrite/_db/_design/nrama/_view/pageId_type_userId?key=%5B%22http%3A%2F%2Fwww2.warwick.ac.uk%2Fstudy%2Fnext%2Fconditionalinsurance%22%2C%22quote%22%2C%22steve%22%5D
 */
var getView = function (view, q, callback) {
  var name = _encode(settings.get('name'));
  var viewname = _encode(view);
  var req = {
    url: _getBaseURL() + '/_view/' + viewname,
    data: stringifyQuery(q),
    expect_json: false,
  };
  _request(req, callback, 'jquery');
};
exports.getView = getView;



