/**
 * Ways of serializing and restoring rangy range objects.
 * These would ideally work across browsers; rangy_1_2 claims not to.  
 * (Having multiple ways allow us to upgrade the method of serialization
 * while still being able to correctly deserialize quotes created with older
 * methods.)
 * @param lib{map} provides rangy
 */

var rangy = require('rangy');
var _unused = require('./lib/rangy-serializer');  //plugin for rangy.serializeRange functions


var settings = require('./settings');



var serializers = {
  // for now I'm assuming rangy_1_2 can be desrialized using the current version of rangy
  rangy_1_2 : {
    id : 'rangy_1_2',   // id must match the name
    serialize : function(range) {
      // second param means do not compute checksum (because adding highlights to page screws it up)
      return rangy.serializeRange(range, true, settings.root_node);
    },
    deserialize : function(text) {
      return rangy.deserializeRange(text, settings.root_node);
    }
  },
  rangy_1_3 : {
    id : 'rangy_1_3',   // id must match the name
    serialize : function(range) {
      // second param means do not compute checksum (because adding highlights to page screws it up)
      return rangy.serializeRange(range, true, settings.root_node);
    },
    deserialize : function(text) {
      return rangy.deserializeRange(text, settings.root_node);
    }
  }
  
};
serializers.current = serializers.rangy_1_3;   // the serializer to be used in creating new quotes

module.exports = serializers;