// npm modules (should be listed in package.json)
var $ = require('jquery');

// 3rd party non-npm modules
// [none]

// nrama modules
var settings = require('./settings');
var log = require('./log').log;


var debug = function(){
  var map_or_array = arguments.length === 1 ? arguments[0] : arguments;
  $.each(map_or_array, function(key,val){
    if( isFinite(key) ) {
      key = 'a'+key;      //allows us to handle arrays
    }
    log('nrama_debug setting '+key+'='+val);
    if( typeof window !== 'undefined' ) {
      window[key]=val;
    }
    if( typeof(cloneInto) !== 'undefined' && typeof(unsafeWindow) !== 'undefined' ) {
      // firefox extension
      unsafeWindow[key] = cloneInto(val, unsafeWindow);
    }
  });  
};
exports.debug = debug;

//do nothing if not debugging
if( !settings.get('debug') ) {
  debug = function(){};
}
exports.debug = debug;

//convenience callback for testing async
var cb = function(){ log('window.cb called, sending arguments to _debug'); _debug(arguments); }; 
exports.cb = cb;

