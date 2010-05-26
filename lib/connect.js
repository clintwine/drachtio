
/*!
 * Ext JS Connect 0.0.1
 * Copyright(c) 2010 Ext JS, Inc.
 * licensing@extjs.com
 * http://www.extjs.com/license
 */

/**
 * Framework version.
 */

exports.version = '0.0.1'

/**
 * Module dependencies.
 */

var sys = require('sys'),
    Url = require('url'),
    Path = require('path'),
    http = require('http')

if (process.env.EXT_CWD) {
    process.chdir(process.env.EXT_CWD)
}

var config_path = Path.join(process.cwd(), "config", process.env.EXT_ENV || "development");
var environment = require(config_path);

var stack;
// Start the http server
exports.run = function run(configs) {
    var port = process.env.EXT_SOCKET || environment.port;
    configs.push(["", 'connect/providers/404']);
    
    stack = [];
    configs.forEach(function (config) {
        var mod = config[1];
        if (typeof mod === 'string') {
            mod = require('./' + mod);
        }
        
        // Skip invalid configs
        if (!mod.handle) {
            sys.debug("Warning, invalid middleware step: " + JSON.stringify(config));
            return;
        }
        
        // Call the setup function if there is one
        if (mod.setup) {
            mod.setup.apply(mod, [environment].concat(config.slice(2)));
        }

        var routes = config[0];
        if (!Array.isArray(routes)) {
            routes = [routes];
        }
        
        routes.forEach(function (route) {
            // Push the middleware on the routing stack
            stack.push({
                route: route,
                handler: mod.handle
            });
        });
        
    });
    
    
    // Fire up the local http server on the specified port.
    http.createServer(handleRequest).listen(port);
    sys.debug("Starting http app on " + JSON.stringify(port));
};

function handleRequest(request, response) {
    request.url = Url.parse(request.url);
    response.error = function (err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.end(err.stack);
    }
    var pathname = request.url.pathname;
    var index = 0;
    var scope = {};
    (function getNext(request, response) {
        var middleware = stack[index];
        index++;
        if (pathname.indexOf(middleware.route) === 0) {
            return middleware.handler(request, response, getNext, scope);
        }
        getNext(request, response);
    }(request, response));
}