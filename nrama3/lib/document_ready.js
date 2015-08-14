/**
 *  test whether the DOM has finished loading
 *  returns a Promise.
 *  use like:
 *    var ready = require('./lib/document_ready');
 *    ready(document).then(function(){ ... });
 */


var $ = require('jquery');    // for $(document).ready

module.exports = function(document){
  return new Promise(function(fulfill, reject){
    $(document).ready(fulfill);
  });
}