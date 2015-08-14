var $ = require('jquery');
var ready = require('../lib/document_ready')
var db = require('../db');
var persist = require('../persist');
var settings = require('../settings');

console.log('test_persist');


ready(document).then(function(){
  $('#name').text('steve');
  
  settings.set('db_url','http://noteorama.iriscouch.com/test/');
  console.log('db_url set to '+settings.get('db_url'));
  
  a = {
    _id : 'testdocument002_persist',
    note : 'i am another test document for testing persists'
  };
  
  console.log('attempting persist.save ...');
  persist.save(a, function(err,data){
    if(err){
      console.log('save error, window.err set');
      window.err =err;
    } else {
      console.log('saved, window.a and window.data set');
      window.a=a;
      window.data=data;
      console.log('attempting persist.rm ...'); 
      persist.rm(a, function(err,res){
        if(err) {
          console.log('rm error, window.err set');
          window.err =err;
        } else {
          console.log('rm success,  window.res set');
          window.res=res;
          
          console.log('changing database to nrama to test persist.load ...')
          settings.set('db_url','http://noteorama.iriscouch.com/nrama/');
          db.reset_connection();
          persist.load({
              page_id : 'http://www.sciencedirect.com/science/article/pii/S0278262610000552',
              type : 'quote',
              user_id : 'steve'
          }, function(error, data){
            if( error ) {
              console.log('error with persist.load')
            } else {
              console.log('success with persist.load, setting window.quotes');
              window.quotes = data;
            }
          });
        }
      });
    }
  });


});