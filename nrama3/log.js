// npm modules (should be listed in package.json)
var $ = require('jquery');

// nrama modules
var settings = require('./settings');


var log  = function(){
  try {
    var args = Array.prototype.slice.call(arguments);
    $.each(args, function(idx, arg){
      console.log(arg);
    });
    return true;
  } catch(e) {
    return false;
  }
};
exports.log = log;

if( !settings.get('debug') ) {
  logger = function(){ return false; };
}
exports.log = log;
