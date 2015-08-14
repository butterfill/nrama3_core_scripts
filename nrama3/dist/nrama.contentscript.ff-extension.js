/**
 * This is a version of nrama that can be used as a firefox content script
 *
 */

var init = require('../init');
var settings = require('../settings');


init.nrama_init(window,document).then(function(){
  console.log('nrama initialisation success');  
}).catch(function(){
  console.log('nrama initialisation failed');
});