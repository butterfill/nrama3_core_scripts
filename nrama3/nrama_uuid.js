/**
 * thin wrapper around lib/uuid.js
 * formats the uuid
 */

uuid = require('./lib/uuid');

module.exports = function(use_b36/*optional*/) {
  if( use_b36 ) {
    return parseInt(uuid().replace(/-/g,''), 16).toString(36);
  } else {
    return  uuid().replace(/-/g,'')+'N';
  }
};
