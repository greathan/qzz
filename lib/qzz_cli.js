
var qserver = require('./qserver');

var argv = require('optimist').argv;

console.log(argv._)

  var port = argv["port"] || argv["p"]
       , route = argv["route"] || argv["r"];



  qserver.run(port, route);