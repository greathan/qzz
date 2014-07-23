

var fs = require('fs');

var qserver = require('./qserver');

var argv = require('optimist').argv;


//console.log(argv._)

var sub = argv._[0];


var list = {
	server: function() {
  		var port = argv["port"] || argv["p"]
      	 , route = argv["route"] || argv["r"];

      	qserver.run(prot, route);

	},
	pack: function() {

		if (!fs.exists('.ver')) {
			console.log('not find .ver')
		}

	},
	sync: function() {

	}

};

var cmd = list[sub];

cmd && cmd();


//qserver.run(port, route);