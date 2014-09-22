
var config = require("../config");

var fs = require("fs"),
    URL = require("url"),
    connect = require("connect"),
    path = require("path"),
    url = require("url"),
    http = require("http"),
    dns = require("dns"),
    colors = require('colors'),
    build_mockup = require("./build_mockup").build,
    build_mustache = require("./build_hogan").build,
    build_handlebars = require("./build_handlebars").build,
    Qzzpack = require("./pack").pack;

var PROJECT_ROOT = config.work ? config.work : process.cwd();

var mime_config = {
    "js": "application/javascript",
    "css": "text/css"
};

var reCSS = /@import\s+url\(\s*(['"]?)([^'"\)]*)?\1\s*\)/g,
    reJS = /!!document\.write.+src\s*=\s*(['"])([^'"]*)\1/g;


function makeUpCssList(data, host, p, port, protocol) {

    return data.replace(reCSS, function(a, f, s) {

        var temp = url.format({
            host: host + ':' + port,// url.format 不带端口号,手工添加端口
            port: port,
            pathname: p,
            protocol: protocol
        });

        s = s.replace(/\\/g, "/");

        return "@import url(" + url.resolve(temp, s) + ")";
    });
}

function makeUpJsList(data, host, p, port, protocol) {

    return data.replace(reJS, function(a, f, s) {

        var temp = url.format({
            host: host + ':' + port, // url.format 不带端口号,手工添加端口
            port: port,
            pathname: p,
            protocol: protocol
        });

        f = "\\" + f;
        s = s.replace(/\\/g, "/");

        return "!!document.write('<script src=" + f + url.resolve(temp, s) + f;
    });
}

function localServer(port, isPack) {

    var Route = connect.router(function(app) {

        app.all(/([^\/]+)\.mockup$/, function(req, res, next) {
            var uri = URL.parse(req.url, true),
                p = uri.pathname,
                l = path.join(PROJECT_ROOT, p);

            fs.exists(l, function(exists) {

                if (exists) {

                    res.writeHead(200, {
                        'Content-Type': mime_config["js"]
                    });

                    var builded = build_mockup(l, uri, req, res);

                    res.end(builded);

                } else {
                    next();
                }

            });
        });

        app.get(/([^\/]+)\.mustache$/, function(req, res, next) {

            var p = URL.parse(req.url).pathname,
                l = path.join(PROJECT_ROOT, p);

            fs.exists(l, function(exists) {

                if (exists) {

                    res.writeHead(200, {
                        'Content-Type': mime_config["js"]
                    });

                    var builded = build_mustache(l);

                    res.end(builded);

                } else {
                    // console.log("[ERROR]: " + l + " does not exists.");
                    next();
                }

            });
        });

        app.get(/([^\/]+)\.handlebars$/, function(req, res, next) {

            var p = URL.parse(req.url).pathname,
                l = path.join(PROJECT_ROOT, p);

            fs.exists(l, function(exists) {

                if (exists) {

                    res.writeHead(200, {
                        'Content-Type': mime_config["js"]
                    });

                    var builded = build_handlebars(l);

                    res.end(builded);

                } else {
                    next();
                }

            });
        });

        app.get(/(\/prd\/|.*?-srclist\..*?)/, function(req, res, next) {

            var p = URL.parse(req.url).pathname,
                host = req.headers["host"],
                protocol = config.protocol || "http",
                type = "js",
                pack = isPack ? isPack : !!config.pack_output;

            //匹配的时候,在srclist中,允许出现 aa-1.2.3.js aa-123.js 两种情况
            p.replace(/^(.+\/)prd(\/[^?#]+-)([\d\.]+\d)(\.(js|css))/, function(a, f, s, t, l, ll) {
                p = f + "src" + s + "srclist" + l;
                type = ll;
            });

            var ua = req.headers['user-agent'];
            var isSafari = false; //~ua.indexOf('Safari') && ua.indexOf('Chrome') < 0;

            var url = req.url.replace(/.*(\/international\/.*-)\d+\.js(.*)/, '$1srclist.js');

            fs.exists(path.join(PROJECT_ROOT, p), function(exists) {

                if (exists && !isSafari) {

                    res.writeHead(200, {
                        'Content-Type': mime_config[type]
                    });

                    if (pack || config.pack_list.indexOf(url) >= 0) {
                        var returnData = Qzzpack(path.join(PROJECT_ROOT, p), type);

                        res.end(returnData);
                    } else {
                        fs.readFile(path.join(PROJECT_ROOT, p), function(err, data) {

                            if (err) {
                                throw err;
                            }

                            if (type === "css") {
                                data = makeUpCssList(data.toString(), host, p, port, protocol);
                            } else if (type === "js") {
                                data = makeUpJsList(data.toString(), host, p, port, protocol);
                            }

                            res.end(data);
                        });
                    }

                } else {

                    console.log("[LOG]: " + req.url + " from PRD");

                    http.get({
                        host: config.prd,
                        path: req.url,
                        headers: {
                            host: 'qunarzz.com'
                        }
                    }, function(response) {

                        response.on('data', function(chunk) {
                            res.write(chunk);
                        })
                            .on('end', function() {
                                res.end();
                            }).on('error', function(e) {
                                console.log(e.red)
                            });

                    }).on('error', function(e) {
                        console.log("[ERROR]: " + "Got from qzz.dev error: " + req.url);
                        next();
                    });

                }

            });

        });
    });

    var server = connect.createServer(
        connect.logger("dev"), connect.bodyParser(), Route, connect.static(PROJECT_ROOT, {
            hidden: true,
            redirect: true
        }), connect.query(), connect.directory(PROJECT_ROOT, {
            hidden: true
        })
    );

    listenPort(server, port);
}

function listenPort(server, port) {

    /* To modify mime.default_type = mime.types.txt */

    port = port || config.default_port || 80;

    server.on('error', function(e) {
        if (e.code == 'EADDRINUSE') {
            console.log("[ERROR]: " + 'Port ' + port + ' is in use.'.red);
        }
        if (e.code == 'EACCES') {
            console.log("[ERROR]: " + 'Permission Denied.'.red);
        }
        process.exit(0);
    });

    server.on('listening', function(e) {
        console.log("[LOG]: " + "Running success on port " + port.toString().magenta);
        console.log("[LOG]: " + "Press Ctrl + C to exit.");
    });

    server.listen(port);
}

function proxyServer(port, route) {

    console.log("[LOG]: " + route);

    var Route = connect.router(function(app) {

        app.get("*", function(req, res, next) {

            http.get({
                host: route,
                path: req.url,
                headers: {
                    "Host": config.server_domain
                }
            }, function(response) {

                response.on('data', function(chunk) {
                    res.write(chunk);
                })
                    .on('end', function() {
                        res.end();
                    });

            }).on('error', function(e) {
                console.log("[ERROR]: " + "Got error: " + e.message);
            });

        });

    });

    var server = connect.createServer(
        connect.logger("tiny"), Route
    );

    listenPort(server, port);
}

function runServer(port, route, pack) {

    dns.lookup(config.server_domain, function(err, addr) {
        if (addr !== "127.0.0.1") {
            console.log("\n[NOTICE]: " + " Route qunarzz.com 127.0.0.1 to use this server. \n");
        }
    });

    if (!route || route === "local") {
        localServer(port, pack);
    } else {

        if (route === "prd") {

            dns.resolve4(config.server_domain, function(err, addresses) {
                if (err) throw err;

                var random = (addresses.length * Math.random()) | 0,
                    addr = addresses[random];

                route = addr;
                proxyServer(port, route);
            });

        } else if (route === "dev") {
            route = config.dev;
            proxyServer(port, route);
        } else if (route === "test") {
            route = config.test;
            proxyServer(port, route);
        }
    }

}

exports.run = runServer;
