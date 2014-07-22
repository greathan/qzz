var Handlebars = require('handlebars'),
    argv = require('optimist').argv,
    path = require('path'),
    fs = require('fs');

var output = argv.o;

exports.build = function(l){

    var builded = 'if(typeof QTMPL === "undefined"){var QTMPL={};}\n';
    var name = path.basename(l, '.handlebars');

    var file = fs.readFileSync(l);

    try{
        builded += '(function() {\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n';
        builded += 'QTMPL.' + name + ' = { render : template(' + Handlebars.precompile(file.toString(), { asString: 1 }) + ') }';
        builded += '})();';
    } catch(e){
        console.log(e);
    }
    
    return builded;
}