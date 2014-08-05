var fs = require('fs'),
    fse = require('fs-extra');


var argv = require('optimist').argv,
    yaml = require('js-yaml'),
    colors = require('colors'),
    child_process = require('child_process');


var qserver = require('./qserver'),
    pack = require('./pack'),
    svn = require('./svn');

var sub = argv._[0];

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

    min: function() {

    	var uglify = require('uglify-js');

    },

    x: function() {
        list.pack(list.sync);
    },

    diff: function() {

    	svn.diff(argv._[1], argv.summ);

    },

    br: function() {

    	svn.br(argv._[1], argv._[2], argv.s);

    },

    tmg: function() {

    	svn.tmg();

    },

    mg: function() {

    	svn.mg();

    	//svn merge

    },

    sw: function() {

    	svn.sw(argv._[1]);
    	
    },
    rvt: function() {

    	svn.rvt(argv._[1]);

    }

};

var cmd = list[sub];

if (cmd) {
	cmd();
} else {
	console.log('>>>>>>>>>>QZZ Tools<<<<<<<<<'.yellow);
	console.log('  qzz server -p 端口号 -c (pack模式)');
	console.log('  qzz pack  打包');
	console.log('  qzz sync  同步开发机');
	console.log('  qzz x     执行 pack sync 并且删除 dev 文件夹');
	console.log('>>>>>>>>>>SVN 相关<<<<<<<<<<'.yellow);
	console.log('  qzz mg    merge trunk(svn up->svn merge->svn ci)');
	console.log('  qzz tmg   test merge');
	console.log('  qzz br    branch(qzz br br_name msg)');
	console.log('  qzz rvt   revert(qzz rvt [addr])');
	console.log('  qzz sw    switch(qzz sw br_name)');
}


//qserver.run(port, route);