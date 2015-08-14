var $ = require('jquery');
var settings = require('../settings');

var db_url = settings.get('db_url');

console.log('test_settings');
console.log('db_url direct '+settings.db_url);
console.log('db_url get '+ db_url);
console.log('test_settings ok');

$(document).ready(function(){
  $('#name').text('steve');

  $('#db_url').text(db_url);
  settings.set('db_url','http://noteorama.iriscouch.com/test/');
  $('#db_url2').text(settings.get('db_url'));

});