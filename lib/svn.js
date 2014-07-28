#!/usr/bin/env node

var cfg = {
	TRUNK: 'trunk',
	QZZ: 'http://svn.corp.qunar.com/svn/qzz.com/'
};


var exec = require('child_process').exec,
	spawn = require('child_process').spawn;

var argv = process.argv;

var act = argv[2],
	param = argv.slice(3);


var SVN = (function(C) {

	return {
		init: function(act, arg) {
			if (this[act]) {
				this[act](arg);
			} else {
				this.help();
			}

		},
		mg: function(arg) {
			this.getUrl(function(url) {

				exec('svn up', function(e, o, se) {
					log(se, o);
					if (se) return;

					exec('svn merge ' + url.trunk, function(e, o, se) {

						log(se, o);
						if (se) return;

						exec('svn ci -m \'merge from trunk\'', function(e, o, se) {
							log(se, o);
						})

					})

				});

			});

		},
		tmg: function(arg) {
			this.getUrl(function(url) {
				exec('svn up', function(e, o, se) {
					log(se, o);
					if (se) return;
					exec('svn merge ' + url.trunk + ' --dry-run', function(e, o, se) {
						log(se, o);
					})
				});
			});
		},
		br: function(branch_name, msg) {
			this.getUrl(function(url) {

				var list = ['svn', 'cp', url.trunk, url.branch + branch_name, '-m', '"' + msg + '"'];

				exec(list.join(' '), function(e, o, se) {

					log(se, o);

				});

			});

		},
		sw: function(brch) {
			this.getUrl(function(url) {
				var list = ['svn', 'sw', url.branch + brch];
				exec(list.join(' '), function(e, o, se) {
					log(se, o);
				})
			});
		},
		up: function(arg) {
			exec('svn up', function(e, o, se) {
				log(se, o);
			});
		},
		cu: function(arg) {
			exec('svn cleanup', function(e, o, se) {
				log(se, o);
			})
		},
		co: function(arg) {
			exec('svn co ' + cfg.QZZ + arg[0] + '/branches/' + arg[1], function(e, o, se) {
				log(se, o);
			});
		},
		ls: function(arg) {
			this.getUrl(function(url) {

				var cmd_stack = ['svn', 'ls', url.branch + (arg[0] || '')];
				exec(cmd_stack.join(' '), function(e, o, se) {
					log(se, o);
				});

			});
		},
		diff: function(addr, summarize) {
			this.getUrl(function(url) {

				summarize = summarize ? '--summarize' : '';

				addr = addr ? ('/' + addr) : ''

				var list = ['svn', 'diff', url.trunk + addr, url.origin + addr, summarize];
				exec(list.join(' '), function(e, o, se) {
					log(se, o);
				})
			});
		},
		help: function() {
			var list = [
				'usage: sv <subcommand> [options] [args]\n',
				'Available subcommands:\n\t',
				'co: check out(co qzz branch_name)\n\t',
				'mg: merge from trunk\n\t',
				'tmg: test merge\n\t',
				'br: create new branch(branch branch_name comment)\n\t',
				'sw: switch branch(sw branch_name)\n\t',
				'up: update\n\t',
				'ls: list\n\t',
				'rvt: revert current directory\n\t',
				'url: current branch url\n\t',
				'diff: diff with trunk'
			];
			console.log(list.join(''));
		},
		url: function() {
			this.getUrl(function(url) {
				console.log(url.origin);
			});
		},

		rvt: function(src) {
			exec('svn revert -R ' + (src || '.'), function(e, o, se) {
				log(se, o);
			});
		},

		getUrl: function(callback) {

			exec('svn info', function(e, o, se) {

				var url = o.match(/URL\:\s(.*)/)[1];

				var origin = url;

				var branch = url.replace(/(branches\/).*/, '$1');

				var trunk = url.replace(/branches\/.*/, C.TRUNK);

				var url = o.replace('URL:', '').replace(/branches\/.*/, C.TRUNK).replace(/\n/, '');
				//log(se, o);
				
				if (!se && o && typeof callback == 'function') callback({
					branch: branch,
					trunk: trunk,
					origin: origin
				});
			
			});
		}
	};


	function log(e, r) {
		r && console.log(r);
		e && console.log(e)
	}

})(cfg);

exports.getUrl = SVN.getUrl;
exports.url = SVN.url;
exports.up = SVN.up;
exports.mg = SVN.mg;
exports.tmg = SVN.tmg;
exports.rvt = SVN.rvt;
exports.diff = SVN.diff;
exports.ls = SVN.ls;
exports.sw = SVN.sw;
exports.br = SVN.br;