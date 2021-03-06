#! /usr/bin/env node

var argv = require('optimist').argv,
    path = require('path'),
    fs = require('fs'),
    fse = require('fs-extra'),
    colors = require('colors'),
    util = require('./util'),
    mkdirp = require('mkdirp'),
    child_process = require('child_process'),
    temp = require('temp'),
    build_mustache = require("./build_hogan").build,
    build_handlebars = require("./build_handlebars").build;


var JS_REG = /!!document\.write.*src=['"]([^'"]*)['"].*/;
var CSS_REG = /@import\s+url\s*\(\s*['"]?([^'"\)]*)['"]?\s*\)/;

//多域名控制格式为
/*@source img1.qunarzz.com img2.qunarzz.com img3.qunarzz.com img4.qunarzz.com */
var RE_DOMAINS_CONF = /\/\*@source(.+)\*\//;
var RE_DOMAINS = /[^\s@*\/]+/g;
var RE_SOURCE = /(http:\/\/)source.qunar.com(\/[^"'\s\)]+)/g;

var WIN = /win/i.test(process.platform) && !/darwin/i.test(process.platform);
var EOF = WIN ? "\r\n" : "\n";
var SLASH = WIN ? "\\" : "/";
var QPATH = __dirname;

function syncIncludeFiles(type) {
    var cwd = process.cwd();
    var f = path.join(process.cwd(), ".include");
    if (!fs.existsSync(f)) {
        return;
    }

    console.log("\n[SYNC] start.");

    var includes = require(f).includes;
    (includes || []).forEach(function(f) {
        var src = path.resolve(cwd, 'src', f);
        var dest = path.resolve(cwd, type, f);
        if (!fs.existsSync(src)) {
            console.log("[SYNC] , not found " + src);
            return;
        }
        fse.mkdir(path.dirname(dest), function(err) {
            if (err) {
                console.error(err.red);
            } else {
                fse.copy(src, dest, function(err) {
                    if (err) {
                        console.error("[SYNC] , " + err.toString().red);
                    } else {
                        console.log("[SYNC] to " + type + " : " + src + " --> " + dest.red);
                    }
                });
            }
        });
    });
}

function makeupLines(file, type) {

    var lines;

    if (type === "js") {
        lines = loopJSFilter(file);
    } else if (type === "css") {
        lines = loopCSSFilter(file);
    }

    return util.floorArray(lines);
}

function loopJSFilter(file) {
    var lines = util.readLinesSync(file),
        dirname = path.dirname(file);

    var root = path.resolve(".");

    lines.forEach(function(line, i) {
        if (~line.indexOf("!!document.write")) {
            var ls = line.match(JS_REG);
            if (!ls) {
                return;
            }

            var pt = path.join(dirname, ls[1]).replace(/[\\\/]/g, SLASH);
            var mu;

            if (/.mustache$/.test(pt)) {
                mu = build_mustache(pt);
            } else if (/.handlebars$/.test(pt)) {
                mu = build_handlebars(pt);
            } else {
                mu = loopJSFilter(pt);
            }

            lines[i] = mu;
            console.log("    %s", pt.replace(root, '').replace('/', '').grey);
        }
    });

    return lines;
}

function loopCSSFilter(file) {
    var lines = util.readLinesSync(file),
        dirname = path.dirname(file);

    var root = path.resolve(".");

    lines.forEach(function(line, i) {
        if (~line.indexOf("@import")) {
            var ls = line.match(CSS_REG);
            if (!ls) {
                return;
            }
            var pt = path.join(dirname, ls[1]).replace(/[\\\/]/g, SLASH);
            var mu = loopCSSFilter(pt);
            lines[i] = mu;
            console.log("    %s", pt.replace(root, '').replace('/', '').grey);
        }
    });

    return lines;
}

function replaceDomains(lines) {

    var first = lines[0],
        mc = first.match(RE_DOMAINS_CONF);

    if (!mc) {
        //console.log('not found RE_DOMAINS_CONF.')
        return lines;
    }

    var dms = mc[1].match(RE_DOMAINS);

    var summary = dms.map(function() {
            return 0;
        }),
        summary_map = {};

    lines = lines.map(function(line, i) {

        return line = line.replace(RE_SOURCE, function(a, p, f) {

            if (summary_map.hasOwnProperty(f)) {
                return p + dms[summary_map[f]] + f;
            } else {
                var i = util.pathToInt(f, dms.length);
                summary[i]++;
                summary_map[f] = i;
                return p + dms[i] + f;
            }
        });
    });

    summary.forEach(function(item, i) {
        console.log("%s: %s", dms[i], item);
    });

    return lines;
}

function packSrcList(file, mime) {
    var lines_array = makeupLines(file, mime);

    if (mime === "css") {
        lines_array = replaceDomains(lines_array);
    }

    return lines_array.join(EOF);
}

exports.pack = packSrcList;

exports.run = function(callback, type) {

    if (!fs.existsSync(".ver")) {
        console.log("File .ver do not exist in current folder.".red);
        return;
    }

    if (type === true) {
        type = "jpack";
    }

    if (typeof type === "string") {
        type = type.toLowerCase();
    }

    var version = fse.readFileSync(".ver").toString(),
        root = path.resolve("."),
        files = util.readFilesDeep(path.join(root, "$src$"), /\-srclist\.(?:js|css)$/);

    var i = 0;

    (function() {

        var file = files[i++],
            next = arguments.callee;

        if (!file) {
            return;
        }

        var dest = file.replace("$src$", type ? "prd" : "dev")
            .replace("-srclist", type ? ("-" + version) : "-dev");

        file = file.replace("$src$", "src");

        var mime = /\.css$/.test(file) ? "css" : "js";

        var out = dest.replace(root, '').replace('/', '');

        console.log("%sPack:%s", EOF, out.green);

        var linesData = packSrcList(file, mime);

        var tempfile = temp.openSync();

        fse.writeSync(tempfile.fd, linesData);

        mkdirp.sync(path.dirname(dest));

        if (!type) {

            //console.log("%s >> %s", tempfile.path, dest);

            fse.writeFileSync(dest, fse.readFileSync(tempfile.path));

            next();

        } else if (mime === "css") {

            var command = "jpack " + tempfile.path + " -c -o " + dest;

            console.log(command);

            child_process.exec(command, function(error, stdout, stderr) {
                if (error) {
                    console.log(error.red);
                }
                if (stderr) {
                    console.error(stderr.red);
                }
                next();
            });

        } else if ((type === "uglifyjs" || type === "uglify") && mime === "js") {

            var uglifyjs = path.resolve(QPATH, "../node_modules/uglify-js/bin/uglifyjs");
            var command = uglifyjs + " -c -o " + dest + " " + tempfile.path;

            console.log(command);

            child_process.exec(command, function(error, stdout, stderr) {
                if (error) {
                    console.log(error.red);
                }
                if (stderr) {
                    console.error(stderr.red);
                }
                next();
            });

        } else if ((type === "jpack" || type === "yui") && mime === "js") {
            // TODO jpack adapt no need
            var command = "jpack " + tempfile.path + " -o " + dest;

            console.log(command);

            child_process.exec(command, function(error, stdout, stderr) {
                if (error) {
                    console.log(error.red);
                }
                if (stderr) {
                    console.error(stderr.red);
                }
                next();
            });
        }

    })();

    syncIncludeFiles(type ? "prd" : "dev");

    callback && callback();

};