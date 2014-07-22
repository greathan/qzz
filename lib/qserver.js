require("./config");

var fs = require("fs")
    , URL = require("url")
    , qs = require('querystring')
    , connect = require("connect")
    , argv = require('optimist').argv
    , path = require("path")
    , url = require("url")
    , http = require("http")
    , dns = require("dns")
    , build_mockup = require("./build_mockup").build
    , build_mustache = require("./build_hogan").build
    , build_handlebars = require("./build_handlebars").build
    , Qzzpack = require("./pack").pack;

var mime_config = {
    "js" : "application/javascript",
    "css" : "text/css"
};

var reCSS = /@import\s+url\(\s*(['"]?)([^'"\)]*)?\1\s*\)/g
    , reJS = /!!document\.write.+src\s*=\s*(['"])([^'"]*)\1/g;


function makeUpCssList(data, host, p, port, protocol){

    return data.replace(reCSS, function(a, f, s){

        var temp = url.format({
            host: host,
            port: port,
            pathname: p,
            protocol: protocol
        });

        s = s.replace(/\\/g, "/");

        return "@import url(" + url.resolve(temp, s) + ")";
    });
}

function makeUpJsList(data, host, p, port, protocol){

    return data.replace(reJS, function(a, f, s){

        var temp = url.format({
            host: host,
            port: port,
            pathname: p,
            protocol: protocol
        });

        f = "\\" + f;
        s = s.replace(/\\/g, "/");

        return "!!document.write('<script src=" + f + url.resolve(temp, s) + f;
    });
}

function localServer(port){

    var Route = connect.router(function(app){

        app.all(/([^\/]+)\.mockup$/, function(req, res, next){
            var uri = URL.parse( req.url , true ) 
                , p = uri.pathname 
                , l = path.join(PROJECT_ROOT, p);

            path.exists( l, function(exists){

                if (exists) {

                    res.writeHead(200, { 'Content-Type': mime_config["js"] });

                    var builded = build_mockup( l , uri , req , res );

                    res.end(builded);

                } else {
                    next();
                }

            });
        });

        app.get(/([^\/]+)\.mustache$/, function(req, res, next){
            
                var p = URL.parse( req.url ).pathname
                , l = path.join(PROJECT_ROOT, p);

            path.exists( l, function(exists){

                if (exists) {

                    res.writeHead(200, { 'Content-Type': mime_config["js"] });

                    var builded = build_mustache(l);

                    res.end(builded);

                } else {
                    // console.log("[ERROR]: " + l + " does not exists.");
                    next();
                }

            });
        });

        app.get(/([^\/]+)\.handlebars$/, function(req, res, next){
            
                var p = URL.parse( req.url ).pathname
                , l = path.join(PROJECT_ROOT, p);

            path.exists( l, function(exists){

                if (exists) {

                    res.writeHead(200, { 'Content-Type': mime_config["js"] });

                    var builded = build_handlebars(l);

                    res.end(builded);

                } else { 
                    next();
                }

            });
        });

        app.get(/(\/prd\/|.*?-srclist\..*?)/, function(req, res, next){

            var p = URL.parse( req.url ).pathname
                , host = req.headers["host"]
                , protocol = PROTOCOL || "http"
                , type = "js"
                , pack = !!PACK_OUTPUT;

            //匹配的时候,在srclist中,允许出现 aa-1.2.3.js aa-123.js 两种情况
            p.replace(/^(.+\/)prd(\/[^?#]+-)([\d\.]+\d)(\.(js|css))/, function(a, f, s, t, l, ll){
                p = f + "src" + s + "srclist" + l;
                type = ll;
            });

            var ua = req.headers['user-agent'];
            var isSafari = false; //~ua.indexOf('Safari') && ua.indexOf('Chrome') < 0;

            var url = req.url.replace(/.*(\/international\/.*-)\d+\.js$/, '$1srclist.js');

            path.exists( path.join(PROJECT_ROOT, p), function(exists){
                
                if (exists && !isSafari) {

                    res.writeHead(200, { 'Content-Type': mime_config[type] });

                    if (pack || PACK_LIST.indexOf(url) >= 0) {
                        var returnData = Qzzpack(path.join(PROJECT_ROOT, p), type);

                        res.end(returnData);
                    } else {
                        fs.readFile( path.join(PROJECT_ROOT, p), function (err, data) {

                            if (err) { throw err; }

                            if (type === "css") {
                                data = makeUpCssList(data.toString(), host, p, port, protocol);
                            } else if (type === "js"){
                                data = makeUpJsList(data.toString(), host, p, port, protocol);
                            }

                            res.end(data);
                        });
                    }
                    
                } else {

                    console.log("[LOG]: " + req.url + " from PRD");

                    var ip = '59.151.16.185'; // prd
                    //l-qzz1.fe.dev.cn6.qunar.com 192.168.237.71
                    http.get({ host: ip, path: req.url, headers: {host: 'qunarzz.com'}}, function(response){

                        response.on('data', function (chunk) { res.write(chunk); })
                        .on('end', function () { res.end(); }).on('error', function(e) {
                            console.log(e)
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
        connect.logger("dev")
        , connect.bodyParser()
        , Route
        , connect.static(PROJECT_ROOT, { hidden: true, redirect: true})
        , connect.query()
        , connect.directory(PROJECT_ROOT, { hidden: true })
    );

    listenPort(server, port);
}

function listenPort(server, port){

    /* To modify mime.default_type = mime.types.txt */

    port = port || DEFAULT_PORT || 80;

    server.on('error', function (e) {
        if (e.code == 'EADDRINUSE') { console.log("[ERROR]: " + 'Port ' + port + ' is in use.'); }
        if (e.code == 'EACCES') { console.log("[ERROR]: " + 'Permission Denied.'); }
        process.exit(0);
    });

    server.on('listening', function (e) {
        console.log("[LOG]: " + "Running success on port " + port + ".");
        console.log("[LOG]: " + "Press Ctrl + C to exit.");
    });

    server.listen(port);
}

function proxyServer(port, route){

    console.log("[LOG]: " + route);

    var Route = connect.router(function(app){

        app.get("*", function(req, res, next){

            http.get({ host: route, path: req.url, headers: { "Host": SERVER_DOMAIN }}, function(response){
                
                response.on('data', function (chunk) { res.write(chunk); })
                .on('end', function () { res.end(); });

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

function runServer(port, route){

    dns.lookup(SERVER_DOMAIN, function(err, addr){
        if (addr !== "127.0.0.1") {
            console.log("\n[NOTICE]: " + " Route qunarzz.com 127.0.0.1 to use this server. \n");
        }
    });

    if (!route || route === "local") {
        localServer(port);
    } else {

        if (route === "prd") {

            dns.resolve4(SERVER_DOMAIN, function (err, addresses) {
                if (err) throw err;

                var random = (addresses.length * Math.random()) | 0
                    , addr = addresses[random];

                route = addr;
                proxyServer(port, route);
            });

        } else if (route === "dev") {
            route = DEV;
            proxyServer(port, route);
        } else if (route === "test"){
            route = TEST;
            proxyServer(port, route);
        }
    } 

}

if (!PROJECT_ROOT) {
    global.PROJECT_ROOT = process.cwd();
}

exports.run = runServer;

