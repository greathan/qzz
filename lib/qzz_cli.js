var fs = require('fs'),
    fse = require('fs-extra');


var argv = require('optimist').argv,
    yaml = require('js-yaml'),
    colors = require('colors'),
    child_process = require('child_process');


var qserver = require('./qserver'),
    pack = require('./pack');

var sub = argv._[0];

var a = 'test'

var list = {
    server: function() {
        var port = argv["port"] || argv["p"],
            route = argv["route"] || argv["r"],
            pack = argv['c'];

        qserver.run(port, route, pack);

    },
    pack: function(callback) {

        pack.run(callback);

    },
    sync: function() {

        var exclude = [".svn", ".git", ".idea", ".DS_Store"];

        var dev = yaml.safeLoad(fs.readFileSync('.dev', 'utf-8'));

        var cmd = ["rsync -rzcv --chmod='a=rX,u+w' --rsync-path='sudo rsync' ./ "];
        //cmd.push('wei.han@')
        cmd.push(dev.dev.host);
        cmd.push(':');
        cmd.push(dev.dev.path);

        exclude.forEach(function(item) {
            cmd.push(' --exclude "', item, '"');
        });

        cmd.push(' --temp-dir=/tmp');

        child_process.exec(cmd.join(''), function(error, stdout, stderr) {

            if (error) {
                console.log(error.red);
                return;
            }
            console.log(stdout.toString().replace(/(\d)/g, '$1'.magenta));

            fse.removeSync('dev');

        });

    },

    x: function() {
        list.pack(list.sync);
    }

};

var cmd = list[sub];

cmd && cmd();


//qserver.run(port, route);