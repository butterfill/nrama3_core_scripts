/**
 * This is a version of nrama that can be used as a chrome content script
 *
 */

var init = require('../init');
var settings = require('../settings');
var $ = require ('jquery');

// self.port.on('nrama_init', function(){ alert('init');});


var initNrama = function (userDetails) {
  $(document).ready(function(){

    // we will prevent loading twice by adding an element, #_nrama_status, to the page.
    // This is necessary because distinct contentscripts don't see each other
    // (or so I think the docs say).

    // check not already loaded:
    if( $('#_nrama_status').length > 0 ) {
      // yes, nrama already loaded (or loading)
      console.log('nrama already loaded (or attempted)');
      var page_id = init.get_page_id(window);
    } else {
      // no sign nrama is already loaded, can carry on ...
      $('body').append('<div id="_nrama_status"></div>');
      $('#_nrama_status').data({loading:true});
    
    
      settings.set('user_id', userDetails.nrama_user);
      settings.set('password',userDetails.nrama_pw);
      console.log("items");
      console.log(userDetails);
      // initialise nrama 
      init.nrama_init(window,document).then(function(){
        // -- init succeed
        console.log('nrama initialisation success');  
        $('#_nrama_status').data({loading:false, loaded:true});
      }).catch(function(){
        console.log('nrama initialisation failed');
        $('#_nrama_status').data({loading:false, loaded:false, failed:true});
      });  
    }
  });
  
};


chrome.storage.sync.get({
  nrama_user: '',
  nrama_pw : ''
}, function(items) {
  initNrama(items)
});

