var $ = require('jquery');
var db = require('../db');
var settings = require('../settings');

console.log('test_db');


$(document).ready(function(){
  $('#name').text('steve');
  
  settings.set('db_url','http://noteorama.iriscouch.com/test/');
  console.log('db_url set to '+settings.get('db_url'));
  
  db.connect().then(function(info){
    console.log('connected to '+info.db_name);
    $('#db_connection').text(info.db_name);
  });
  
  a = {
    _id : 'testdocument002',
    note : 'i am another test document'
  };
  
  db.put(a).then(function(data){
    console.log('saved; putting a and data in window');
    window.a = a;
    window.data = data;
    a._rev = data.rev;
    db.remove(a).then(function(res){
      console.log('removed; putting res in window');
      window.res = res;
    })
  });

});