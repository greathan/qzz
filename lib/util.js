var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');


exports.readFilesDeep = function(root, filter){

    var realRoot = root.replace(/\$([a-z]+)\$/, "$1");

    var res = [],
        self = arguments.callee,
        files = fs.readdirSync(realRoot);

    files.forEach(function(file){

        var pathname = path.join(realRoot, file)
            , rawPath = path.join(root, file)
            , stat = fs.lstatSync(pathname);

        if (!stat.isDirectory()){
            if (!filter || filter.test && filter.test(pathname)) {
                res.push(rawPath);   
            }
        } else {
            res = res.concat(self(rawPath, filter));
        }

    });

    return res;
}

exports.readLinesSync = function(path){

    var buffer = fs.readFileSync(path);

    // remove BOM
    if (buffer[0] === 239 && buffer[1] === 187 && buffer[2] === 191) {
        buffer = buffer.slice(3);
    }

    return buffer.toString().split(/\r?\n/);
}

exports.floorArray = function(lines){
    var ret = [];

    lines.forEach(function(line, i){
        if (Array.isArray(line)) {
            ret = ret.concat(exports.floorArray(line));
        } else {
            ret.push(line);
        }
    });

    return ret;
}

exports.pathToInt = function(str, no){

    var d = crypto.createHash("md5")
                .update(str)
                .digest('hex');

    var arr = d.split(""), st = 0;

    arr.forEach(function (chr, i) {
        var c = parseInt(chr, 16);
        
        st = ((st * 16 + c) % no) ;
    });
    
    return st;
}
