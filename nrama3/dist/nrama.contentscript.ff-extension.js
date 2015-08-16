/**
 * This is a version of nrama that can be used as a firefox content script
 *
 */

var init = require('../init');
var settings = require('../settings');
var $ = require ('jquery');

// self.port.on('nrama_init', function(){ alert('init');});



self.port.on('nrama_init', function(user_info) {
  console.log('nrama got user_info' );
  $(document).ready(function(){

    // we will prevent loading twice by adding an element, #_nrama_status, to the page.
    // This is necessary because distinct contentscripts don't see each other
    // (or so I think the docs say).

    // check not already loaded:
    if( $('#_nrama_status').length > 0 ) {
      // yes, nrama already loaded (or loading)
      console.log('nrama already loaded (or attempted)');
      var page_id = init.get_page_id(window);
      self.port.emit('nrama_already_loaded_in_this_tab', page_id);
      // throw new Error("nrama: cannot load twice");
    } else {
      // no sign nrama is already loaded, can carry on ...
      $('body').append('<div id="_nrama_status"></div>');
      $('#_nrama_status').data({loading:true});

      // update settings from firefox extension perferences (provided via port event)
      settings.set('user_id',user_info.username);
      settings.set('password',user_info.password);
      
      // initialise nrama as usual
      init.nrama_init(window,document).then(function(){
        // -- init succeed
        console.log('nrama initialisation success');  
        // update firefox extension preferences to save user logging in again
        self.port.emit('nrama_update_user',{
          username : settings.get('user_id'),
          password : settings.get('password')
        });
        $('#_nrama_status').data({loading:false, loaded:true});
      }).catch(function(){
        console.log('nrama initialisation failed');
        $('#_nrama_status').data({loading:false, loaded:false, failed:true});
      });  
    }
    
  });

});

