/* This file NOT be used */

var fs = require("fs");

function writeRootConfig(path){

    var filename = __dirname + "/config.js";
    var str = fs.readFileSync( filename ).toString();

    path = path || "";

    str = str.replace(/(PROJECT_ROOT\s*=\s*)(")(.*)\2/, function(a, f, s, t){
        return f + s + path.replace(/\\/g, "\\\\") + s;
    });

    fs.writeFileSync(filename, str, "utf-8");
}

exports.promptPath = function(cb){
    if (!PROJECT_ROOT) {
        PROJECT_ROOT = process.cwd();
        console.log("Do you want to remember is qzz folder PATH (yes/no)?");
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', function (chunk) {
          
            if (/^y/i.test(chunk)) {
                writeRootConfig(PROJECT_ROOT);
            }

            process.nextTick(function () { cb(); });

        });
    } else { cb(); }
};

exports.resetPath = function(){
    writeRootConfig();
    process.exit(0);
}