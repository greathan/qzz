var URL = require('url'),
    extend = require('node.extend'),
    trimpath = require('./trimpath-template.js').TrimPath,
    argv = require('optimist').argv,
    path = require('path'),
    fs = require('fs');

var output = argv.o;

function findCallback( params ) {
    var list = ['callback','_jscallback'];
    for( var key in params ) {
        if( ~list.indexOf(key) ) {
            return { key : key , value : params[key] };
        }
    }
    return false;
}


exports.build = function( l , uri , req , res ){

    var file = fs.readFileSync(l);

    var builded = "";

    try{

        var params = extend({},uri.query,req.body);

        var tpl = trimpath.parseTemplate( file.toString() );

        var callback = findCallback(params);

        if( callback ) {
            builded += callback.value + "(";
            delete params[ callback.key ];
        }

        var data = extend({ 
            _PARAMS : params ,
            random : function(){
                var len = arguments.length;
                if( !len ) {
                    return Math.random();
                }

                var idx = Math.floor( Math.random() * len );
                return arguments[idx];
            },
            size : function( iters ){
                if( typeof iters.length != 'undefined' ) return iters.length;
                var len = 0;
                for( var k in iters ) { len++; }
                return len;
            },
            range : function( start , end ) {
                if( typeof end == 'undefined') {
                    end = start;
                    start = 0;
                }
                var list = [];
                for( var i = start ; i <= end; i++ ) {
                    list.push(i);
                }
                return list;
            }
        }, params );

        builded += tpl.process( data );

        if( callback ) {
            builded += ")";
        }

    } catch(e){
        console.log(e);
    }
    
    return builded;
}