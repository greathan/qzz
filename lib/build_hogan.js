var hogan = require('hogan.js'),
    argv = require('optimist').argv,
    path = require('path'),
    fs = require('fs');

var output = argv.o;

exports.build = function(l) {

    var builded = 'if(typeof QTMPL === "undefined"){var QTMPL={};}\n';
    var name = path.basename(l, '.mustache');

    var file = fs.readFileSync(l);

    try {
        builded += 'QTMPL.' + name + ' = new Hogan.Template(' + hogan.compile(file.toString(), {
            asString: 1
        }) + ');';
    } catch (e) {
        console.log(e);
    }

    return builded;
}