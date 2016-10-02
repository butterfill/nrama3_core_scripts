// npm modules
var $ = require('jquery');
var _ = require('underscore');

// 3rd party non-npm modules
var nrama_uuid = require('./nrama_uuid');

// nrama modules
// [none]


/**
 * These are some settings for embedded mode (bkmrklt or <script>).
 * Others are added during init (see page_id and root_node).
 * When used on the server, some settings are overriden.
 * @param lib provides $ (jQuery) and _ (underscore)
 */

var use_localhost = false;

var _settings = {
  // -- internals
  is_embedded : true,     //set to false when being used on the server
  debug : true,
  nrama_version : 3.02,
  
  // obsolete : todo: remove
  xdm_url: ( use_localhost ?
              'http://localhost:5984/nrama/_design/nrama/_rewrite/xdm/provider.debug.html'
             :
              'http://note-o-rama.com/xdm/provider.html'
           ),
           
  event_delay : 750, //min time between creating two notes or quotes
           
  db_url: ( use_localhost ?
              'http://localhost:5984/nrama/'
            :
              'https://notes.butterfill.com/nrama/'
          ),
  // this is used to build requests, change this if redirecting:
  db_url_base : '_design/nrama', 

  // -- user identification
  user_id : '*'+nrama_uuid(true).slice(0,10), //default to random anonymous user:
                                              //  random anonymous user can save and modify notes 
                                              //  without password or login
  password : 'new',   //TODO think of clever way to store this
  me_only : true,    //show only my notes and quotes
           
  // -- quotes & note settings
  note_default_text : 'type now',
  background_color : '#FFFC00', //for quotes todo: I like '#FCF6CF' but can't be seen on some screens -- must implement per user settings soon
  background_color_other : 'rgba(240,240,240,0.5)',   //color for other ppl's notes and quotes (TODO)
  note_background_color : 'rgba(240,240,240,0.9)', 
  persist_started_color : '#FFBF00',  //#FFBF00=orange
  note_width : 150, //pixels
  max_quote_length : 5000,  //useful because prevents
           
  // -- styling
  style : {   //applies to note_editor & dialogs
    fontFamily : "Lato, Palatino, 'Palatino Linotype', Georgia, Times, 'Times New Roman', serif",
    fontSize : '12px',
    color : 'rgb(0,0,0)'
  },
  note_style : {
    'border' : '1px solid',
    'background-color' : 'rgb(229,229,299)',    //default in case options.note_background_color fails
    'border-color' : '#CDC0B0',
    'box-shadow' : '0 0 8px rgba(0,0,0,0.2)',
    '-moz-box-shadow' : '0 0 8px rgba(0,0,0,0.2)',
    '-webkit-box-shadow' : '0 0 8px rgba(0,0,0,0.2)',
    'padding' : '3px',
    'cursor' : 'move',
    'height' : 'auto',
    'z-index' : '9998' //try to ensure always on top
  },
  note_inner_style : {},
  note_editor_style : {
    'wrap' : 'soft',
    'padding-left' : '1px',
    'padding-top' : '1px',
    'padding-right' : '0px',
    'padding-bottom' : '0px',
    'border' : 'none',
    'resize' : 'none',      //remove draggable resize handle in chrome
    'line-height' : '1.3em',
    'background-color' : 'inherit',
    'text-shadow' : '1px 1px 20px rgba(250,250,250,1), -1px -1px 20px rgba(250,250,250,1), 0 0 1px rgba(250,250,250,1)',
    '-moz-text-shadow' : '1px 1px 20px rgba(250,250,250,1), -1px -1px 20px rgba(250,250,250,1), 0 0 1px rgba(250,250,250,1)',
    '-webkit-text-shadow' : '1px 1px 20px rgba(250,250,250,1), -1px -1px 20px rgba(250,250,250,1), 0 0 1px rgba(250,250,250,1)'
  },
  simplemodal : {
    autoResize: true,
    overlayClose: true,
    zIndex : 32000,
    overlayCss : { 'background-color' : '#000' },
    containerCss : {
      height : 'auto',
      backgroundColor : '#fff',
      border: '8px solid #444',
      padding: '12px'
    },
    onShow : function(){
      _.delay( function() { $('.simplemodal-container').css({height:'auto'}); }, 50 );
    }
  }
};

_settings.note_style.width = _settings.note_width+"px";
_settings.note_editor_style.width = _settings.note_width+"px";
$.extend(_settings.note_editor_style, _settings.style);
$.extend(_settings.simplemodal.containerCss, _settings.style);

exports.get = function(name){
  return _settings[name];
}
exports.set = function(name, value) {
  _settings[name] = value;
}
