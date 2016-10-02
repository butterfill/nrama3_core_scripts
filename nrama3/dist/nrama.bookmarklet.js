/**
 * This is a version of nrama that can be used with a bookmarklet
 *
 * To run as bookmarklet:
 *   javascript:(function(){_NRAMA_USER='steve';document.body.appendChild(document.createElement('script')).src='https://notes.butterfill.com/nrama/_design/nrama/bkmrklt/nrama3.bookmarklet.bundle.js'; })();
 *
 * To run from localhost (nb _NRAMA_LOCAL = load everything from localhost)
 *   javascript:(function(){_NRAMA_LOCAL=true;_NRAMA_USER='steve';document.body.appendChild(document.createElement('script')).src='http://localhost:5984/nrama/_design/nrama/bkmrklt/nrama3.bookmarklet.bundle.js'; })();
 *
 * to load from development server :
 *   javascript:(function(){_NRAMA_USER='steve';document.body.appendChild(document.createElement('script')).src='http://localhost:8085/nrama3.bookmarklet.bundle.js'; })();
 *
 */

var init = require('../init');
var settings = require('../settings');

if( typeof(nrama) !== 'undefined' ) {
  throw new Error('nrama can only be initialised once');
}

if( typeof(window) === 'undefined' ) {
  throw new Error('this script can only be used in the browser');
}

if( typeof(_NRAMA_USER) !== 'undefined' ) {
  settings.set('user_id', _NRAMA_USER);
}

if( typeof(_NRAMA_LOCAL) !== 'undefined' && ( _NRAMA_LOCAL === 'true' || _NRAMA_LOCAL === true ) ){
  settings.set('db_url', 'http://localhost:5984/nrama/');
}



window.nrama = {
  status : 'initialising'
};

init.nrama_init(window,document).then(function(){
  window.nrama.status = 'initialized';
  console.log('nrama initialisation success');  
}).catch(function(){
  window.nrama.status = 'initialisation failed';
  console.log('nrama initialisation failed');
});