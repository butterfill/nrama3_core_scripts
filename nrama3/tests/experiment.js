_ = require('underscore');
$ = require('jquery');
_unused = require('../lib/jquery.simplemodal');    //jquery extension for the modal dialog
rangy = require('rangy');
pouchdb = require('pouchdb');
pouchdb.plugin(require('pouchdb-authentication'));

md5 = require('../lib/md5');
bibtex = require('../lib/bibtex');
reset_css_on_element = require('../lib/reset_css_on_element');


nrama_uuid = require('../nrama_uuid');
settings = require('../settings');
log = require('../log').log;
_debug = require('../_debug').debug;
db = require('../db');
persist = require('../persist');
sources = require('../sources');
ui = require('../ui');
serializers = require('../serializers');
quotes = require('../quotes');
notes = require('../notes');
init = require('../init');


// useful global variables
db_url = settings.get('db_url');

//useful callbacks
thn = function(res){
  log('success');
  log(res);
}
fail = function(res){
  log('failure');
  log(res);
}



console.log('experiment');

$(document).ready(function(){
  $('#name').text('steve');


});