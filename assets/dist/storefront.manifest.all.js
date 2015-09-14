(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.index = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global Promise */
/**
 * Implementation for http.storefront.pages.global.request.after


 * HTTP Actions all receive a similar context object that includes
 * `request` and `response` objects. These objects are similar to
 * http.IncomingMessage objects in NodeJS.

 {
configuration: {},
request: http.ClientRequest,
response: http.ClientResponse
}

 * Call `response.end()` to end the response early.
 * Call `response.set(headerName)` to set an HTTP header for the response.
 * `request.headers` is an object containing the HTTP headers for the request.
 * 
 * The `request` and `response` objects are both Streams and you can read
 * data out of them the way that you would in Node.

*/

"use strict";

var path = require('path');
var url = require('url');
var querystring = require('querystring');

var productClientFactory = require('mozu-node-sdk/clients/commerce/catalog/storefront/product');
var searchClientFactory = require('mozu-node-sdk/clients/commerce/catalog/storefront/productSearchResult');

var FiddlyDiddle = require('mozu-node-sdk/plugins/fiddler-proxy');

var syndicatorLibContents = "window.syndicator = \"DAAAAAAAAANG\";\n";

module.exports = function(context, callback) {

  context.plugins = [FiddlyDiddle];
  var productClient = productClientFactory(context);
  var searchClient = searchClientFactory(context);

  var qs = querystring.parse(url.parse(context.request.url).query);

  if ("syndicator" in qs) {
    setMimeType("text/javascript");
    return setBody(syndicatorLibContents);
  } else if ("syndicate" in qs) {
    if (!qs.syndicate) {
      return callback(noSyndicateQueriesError());
    }
    var syndicateQueries; 
    try {
      syndicateQueries = JSON.parse(qs.syndicate);
    } catch(e) {
      return callback(unparseableSyndicateQueriesError(e));
    }
    if (!Array.isArray(syndicateQueries)) {
      return callback(unparseableSyndicateQueriesError("Expected " + qs.syndicateQueries + " to be an array."));
    }
    if (syndicateQueries.length === 0) {
      return callback(noSyndicateQueriesError());
    }
    // now that that's out of the way...

    // little shortcut for the common case
    if (syndicateQueries.length === 1 && syndicateQueries[0].productCodes && syndicateQueries[0].productCodes.length === 1) {
      return productClient.getProduct({ productCode: syndicateQueries[0].productCodes[0] }).then(function(prod) {
        var finalResponse = {};
        finalResponse[syndicateQueries[0].id] = {
          items: [prod]
        };
        finishResponse(finalResponse);
      }).catch(callback);
    }

    var apiCalls = syndicateQueries.map(function(query) {
      if (query.productCodes) {
        return searchClient.search({ filter: "ProductCode eq " + query.productCodes.join(" or ProductCode eq ") });
      } else {
        if (!query.filter && !query.query) {
          throw unparseableSyndicateQueriesError("The query " + JSON.stringify(query) + " could not be parsed. At least a productCodes, filter, or search parameter is required.");
        }
        return searchClient.search(query);
      }
    });

    return Promise.all(apiCalls).then(function(apiResponses) {
      finishResponse(apiResponses.reduce(function(payload, res, i) {
        payload[syndicateQueries[i].id] = res;
        return payload;
      }, {}));
    }).catch(callback);
  } else {
    callback();
  }

  function finishResponse(finalResponse) {
    if (qs.callback) {
      setMimeType("text/javascript");
      setBody(qs.callback + "(" + JSON.stringify(finalResponse) + ");");
    } else {
      setMimeType("text/json");
      setBody(finalResponse);
    }
  }

  function noSyndicateQueriesError() {
    var e = new Error("No syndicateQueries were provided to syndicator.");
    e.code = "NOTHING_TO_SYNDICATE";
    return e;
  }

  function unparseableSyndicateQueriesError(msg) {
    var e = new Error("Could not parse syndicateQueries: " + msg);
    e.code = "COULD_NOT_PARSE_SYNDICATE_QUERIES";
    return e;
  }

  function setMimeType(v) {
    context.response.set({
      'Content-Type': v + '; charset=utf-8'
    });
  }

  function setBody(text) {
    context.response.body = text;
    return context.response.end();
  }

};

},{"mozu-node-sdk/clients/commerce/catalog/storefront/product":4,"mozu-node-sdk/clients/commerce/catalog/storefront/productSearchResult":5,"mozu-node-sdk/plugins/fiddler-proxy":20,"path":undefined,"querystring":undefined,"url":undefined}],2:[function(require,module,exports){
module.exports = {
  
  'http.storefront.pages.global.request.after': {
      actionName:'http.storefront.pages.global.request.after',
      customFunction: require('./domains/storefront/http.storefront.pages.global.request.after')
   }
  
};

},{"./domains/storefront/http.storefront.pages.global.request.after":1}],3:[function(require,module,exports){
var extend = require('./utils/tiny-extend'),
    sub = require('./utils/sub'),
    constants = require('./constants'),
    makeMethod = require('./utils/make-method'),
    getConfig = require('./utils/get-config'),
    normalizeContext = require('./utils/normalize-context'),
    inMemoryAuthCache = require('./plugins/in-memory-auth-cache'),
    versionKey = constants.headers.VERSION,
    version = constants.version;


function makeClient(clientCls) {
  return function(cfg) {
    return new clientCls(extend({}, this, cfg));
  };
}

function cloneContext(ctx) {
  var newCtx;
  if (!ctx) return {};
  try {
    newCtx = JSON.parse(JSON.stringify(ctx));
  } catch(e) {
    throw new Error('Could not serialize context when creating Client. Do not assign non-serializable objects to the client.context.');
  }
  newCtx[versionKey] = newCtx[versionKey] || version;
  return newCtx;
}

function isContextSufficient(context) {
  return context && context.appKey && context.sharedSecret && context.baseUrl;
}

function Client(cfg) {
  cfg = cfg || {};
  var context = normalizeContext(cfg.apiContext || cfg.context || {});
  if (!isContextSufficient(context)) {
    context = context ? extend(getConfig(), context) : getConfig();
  }
  this.context = cloneContext(context);
  this.defaultRequestOptions = extend({}, Client.defaultRequestOptions, cfg.defaultRequestOptions);
  if (cfg.plugins) {
    this.plugins = cfg.plugins.slice();
    this.plugins.forEach(function(p) {
      p(this);
    }.bind(this));
  }
  this.authenticationStorage = this.authenticationStorage || inMemoryAuthCache(this);
}

// statics
extend(Client, {
  defaultRequestOptions: {},
  method: makeMethod,
  sub: function(methods) {
    return makeClient(sub(Client, methods));
  },
  constants: constants
});

// // instance
// extend(Client.prototype, {
//   root: makeClient(Client),
//   commerce: require('./clients/commerce')(Client),
//   content: require('./clients/content')(Client),
//   event: require('./clients/event')(Client),
//   platform: require('./clients/platform')(Client)
// });

module.exports = Client;
},{"./constants":10,"./plugins/in-memory-auth-cache":21,"./utils/get-config":25,"./utils/make-method":26,"./utils/normalize-context":28,"./utils/sub":34,"./utils/tiny-extend":35}],4:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../../client'), constants = Client.constants;

module.exports = Client.sub({
	getProducts: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/?filter={filter}&startIndex={startIndex}&pageSize={pageSize}&sortBy={sortBy}&responseFields={responseFields}'
	}),
	getProductInventory: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/{productCode}/locationinventory?locationCodes={locationCodes}&responseFields={responseFields}'
	}),
	getProduct: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/{productCode}?variationProductCode={variationProductCode}&allowInactive={allowInactive}&skipInventoryCheck={skipInventoryCheck}&supressOutOfStock404={supressOutOfStock404}&responseFields={responseFields}'
	}),
	getProductForIndexing: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/indexing/{productCode}?responseFields={responseFields}'
	}),
	configuredProduct: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/{productCode}/configure?includeOptionDetails={includeOptionDetails}&skipInventoryCheck={skipInventoryCheck}&responseFields={responseFields}'
	}),
	validateProduct: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/{productCode}/validate?skipInventoryCheck={skipInventoryCheck}&responseFields={responseFields}'
	}),
	validateDiscounts: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/{productCode}/validateDiscounts?variationProductCode={variationProductCode}&customerAccountId={customerAccountId}&allowInactive={allowInactive}&skipInventoryCheck={skipInventoryCheck}&responseFields={responseFields}'
	}),
	getProductInventories: Client.method({
		method: constants.verbs.POST,
		url: '{+tenantPod}api/commerce/catalog/storefront/products/locationinventory?responseFields={responseFields}'
	})
});

},{"../../../../client":3}],5:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../../client'), constants = Client.constants;

module.exports = Client.sub({
	search: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/catalog/storefront/productsearch/search/?query={query}&filter={filter}&facetTemplate={facetTemplate}&facetTemplateSubset={facetTemplateSubset}&facet={facet}&facetFieldRangeQuery={facetFieldRangeQuery}&facetHierPrefix={facetHierPrefix}&facetHierValue={facetHierValue}&facetHierDepth={facetHierDepth}&facetStartIndex={facetStartIndex}&facetPageSize={facetPageSize}&facetSettings={facetSettings}&facetValueFilter={facetValueFilter}&sortBy={sortBy}&pageSize={pageSize}&startIndex={startIndex}&searchSettings={searchSettings}&enableSearchTuningRules={enableSearchTuningRules}&searchTuningRuleContext={searchTuningRuleContext}&searchTuningRuleCode={searchTuningRuleCode}&facetTemplateExclude={facetTemplateExclude}&responseFields={responseFields}'
	}),
	suggest: Client.method({
		method: constants.verbs.GET,
		url: '{+tenantPod}api/commerce/catalog/storefront/productsearch/suggest?query={query}&groups={groups}&pageSize={pageSize}&responseFields={responseFields}'
	})
});

},{"../../../../client":3}],6:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../client'), constants = Client.constants;

module.exports = Client.sub({
	createUserAuthTicket: Client.method({
		method: constants.verbs.POST,
		url: '{+homePod}api/platform/adminuser/authtickets/tenants?tenantId={tenantId}&responseFields={responseFields}'
	}),
	refreshAuthTicket: Client.method({
		method: constants.verbs.PUT,
		url: '{+homePod}api/platform/adminuser/authtickets/tenants?tenantId={tenantId}&responseFields={responseFields}'
	}),
	deleteUserAuthTicket: Client.method({
		method: constants.verbs.DELETE,
		url: '{+homePod}api/platform/adminuser/authtickets/?refreshToken={refreshToken}'
	})
});

},{"../../../client":3}],7:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../client'), constants = Client.constants;

module.exports = Client.sub({
	authenticateApp: Client.method({
		method: constants.verbs.POST,
		url: '{+homePod}api/platform/applications/authtickets/?responseFields={responseFields}'
	}),
	refreshAppAuthTicket: Client.method({
		method: constants.verbs.PUT,
		url: '{+homePod}api/platform/applications/authtickets/refresh-ticket?responseFields={responseFields}'
	}),
	deleteAppAuthTicket: Client.method({
		method: constants.verbs.DELETE,
		url: '{+homePod}api/platform/applications/authtickets/{refreshToken}'
	})
});

},{"../../../client":3}],8:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../../client'), constants = Client.constants;

module.exports = Client.sub({
	createDeveloperUserAuthTicket: Client.method({
		method: constants.verbs.POST,
		url: '{+homePod}api/platform/developer/authtickets/?developerAccountId={developerAccountId}&responseFields={responseFields}'
	}),
	refreshDeveloperAuthTicket: Client.method({
		method: constants.verbs.PUT,
		url: '{+homePod}api/platform/developer/authtickets/?developerAccountId={developerAccountId}&responseFields={responseFields}'
	}),
	deleteUserAuthTicket: Client.method({
		method: constants.verbs.DELETE,
		url: '{+homePod}api/platform/developer/authtickets/?refreshToken={refreshToken}'
	})
});

},{"../../../client":3}],9:[function(require,module,exports){


//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by CodeZu.     
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

var Client = require('../../client'), constants = Client.constants;

module.exports = Client.sub({
	getTenant: Client.method({
		method: constants.verbs.GET,
		url: '{+homePod}api/platform/tenants/{tenantId}?responseFields={responseFields}'
	})
});

},{"../../client":3}],10:[function(require,module,exports){
var version = require('./version'),
    DEVELOPER = 1,
    ADMINUSER = 2,
    SHOPPER = 4,
    TENANT = 8,
    SITE = 16,
    MASTERCATALOG = 32,
    CATALOG = 64,
    APP_ONLY = 128,
    NONE = 256;

// scopes are not yet in use, but when the services can reflect
// their required scope, here will be all the bitmask constants

// some contexts are always additive

TENANT |= ADMINUSER;
SITE |= TENANT;
MASTERCATALOG |= TENANT;
CATALOG |= MASTERCATALOG;
SHOPPER |= SITE | CATALOG;

module.exports = {
  scopes: {
    DEVELOPER: DEVELOPER,
    ADMINUSER: ADMINUSER,
    SHOPPER: SHOPPER,
    TENANT: TENANT,
    SITE: SITE,
    MASTERCATALOG: MASTERCATALOG,
    CATALOG: CATALOG,
    APP_ONLY: APP_ONLY,
    NONE: NONE
  },
  verbs: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
  },
  headerPrefix: 'x-vol-',
  headers: {
    APPCLAIMS: 'app-claims',
    USERCLAIMS: 'user-claims',
    TENANT: 'tenant',
    SITE: 'site',
    MASTERCATALOG: 'master-catalog',
    CATALOG: 'catalog',
    DATAVIEWMODE: 'dataview-mode',
    VERSION: 'version'
  },
  dataViewModes: {
    LIVE: 'Live',
    PENDING: 'Pending'
  },
  capabilityTimeoutInSeconds: 180,
  version: version.current
};

},{"./version":37}],11:[function(require,module,exports){
(function (process,Buffer){
'use strict'

var net = require('net')
  , tls = require('tls')
  , http = require('http')
  , https = require('https')
  , events = require('events')
  , assert = require('assert')
  , util = require('util')
  ;

exports.httpOverHttp = httpOverHttp
exports.httpsOverHttp = httpsOverHttp
exports.httpOverHttps = httpOverHttps
exports.httpsOverHttps = httpsOverHttps


function httpOverHttp(options) {
  var agent = new TunnelingAgent(options)
  agent.request = http.request
  return agent
}

function httpsOverHttp(options) {
  var agent = new TunnelingAgent(options)
  agent.request = http.request
  agent.createSocket = createSecureSocket
  return agent
}

function httpOverHttps(options) {
  var agent = new TunnelingAgent(options)
  agent.request = https.request
  return agent
}

function httpsOverHttps(options) {
  var agent = new TunnelingAgent(options)
  agent.request = https.request
  agent.createSocket = createSecureSocket
  return agent
}


function TunnelingAgent(options) {
  var self = this
  self.options = options || {}
  self.proxyOptions = self.options.proxy || {}
  self.maxSockets = self.options.maxSockets || http.Agent.defaultMaxSockets
  self.requests = []
  self.sockets = []

  self.on('free', function onFree(socket, host, port) {
    for (var i = 0, len = self.requests.length; i < len; ++i) {
      var pending = self.requests[i]
      if (pending.host === host && pending.port === port) {
        // Detect the request to connect same origin server,
        // reuse the connection.
        self.requests.splice(i, 1)
        pending.request.onSocket(socket)
        return
      }
    }
    socket.destroy()
    self.removeSocket(socket)
  })
}
util.inherits(TunnelingAgent, events.EventEmitter)

TunnelingAgent.prototype.addRequest = function addRequest(req, options) {
  var self = this

   // Legacy API: addRequest(req, host, port, path)
  if (typeof options === 'string') {
    options = {
      host: options,
      port: arguments[2],
      path: arguments[3]
    };
  }

  if (self.sockets.length >= this.maxSockets) {
    // We are over limit so we'll add it to the queue.
    self.requests.push({host: options.host, port: options.port, request: req})
    return
  }

  // If we are under maxSockets create a new one.
  self.createConnection({host: options.host, port: options.port, request: req})
}

TunnelingAgent.prototype.createConnection = function createConnection(pending) {
  var self = this

  self.createSocket(pending, function(socket) {
    socket.on('free', onFree)
    socket.on('close', onCloseOrRemove)
    socket.on('agentRemove', onCloseOrRemove)
    pending.request.onSocket(socket)

    function onFree() {
      self.emit('free', socket, pending.host, pending.port)
    }

    function onCloseOrRemove(err) {
      self.removeSocket(socket)
      socket.removeListener('free', onFree)
      socket.removeListener('close', onCloseOrRemove)
      socket.removeListener('agentRemove', onCloseOrRemove)
    }
  })
}

TunnelingAgent.prototype.createSocket = function createSocket(options, cb) {
  var self = this
  var placeholder = {}
  self.sockets.push(placeholder)

  var connectOptions = mergeOptions({}, self.proxyOptions, 
    { method: 'CONNECT'
    , path: options.host + ':' + options.port
    , agent: false
    }
  )
  if (connectOptions.proxyAuth) {
    connectOptions.headers = connectOptions.headers || {}
    connectOptions.headers['Proxy-Authorization'] = 'Basic ' +
        new Buffer(connectOptions.proxyAuth).toString('base64')
  }

  debug('making CONNECT request')
  var connectReq = self.request(connectOptions)
  connectReq.useChunkedEncodingByDefault = false // for v0.6
  connectReq.once('response', onResponse) // for v0.6
  connectReq.once('upgrade', onUpgrade)   // for v0.6
  connectReq.once('connect', onConnect)   // for v0.7 or later
  connectReq.once('error', onError)
  connectReq.end()

  function onResponse(res) {
    // Very hacky. This is necessary to avoid http-parser leaks.
    res.upgrade = true
  }

  function onUpgrade(res, socket, head) {
    // Hacky.
    process.nextTick(function() {
      onConnect(res, socket, head)
    })
  }

  function onConnect(res, socket, head) {
    connectReq.removeAllListeners()
    socket.removeAllListeners()

    if (res.statusCode === 200) {
      assert.equal(head.length, 0)
      debug('tunneling connection has established')
      self.sockets[self.sockets.indexOf(placeholder)] = socket
      cb(socket)
    } else {
      debug('tunneling socket could not be established, statusCode=%d', res.statusCode)
      var error = new Error('tunneling socket could not be established, ' + 'statusCode=' + res.statusCode)
      error.code = 'ECONNRESET'
      options.request.emit('error', error)
      self.removeSocket(placeholder)
    }
  }

  function onError(cause) {
    connectReq.removeAllListeners()

    debug('tunneling socket could not be established, cause=%s\n', cause.message, cause.stack)
    var error = new Error('tunneling socket could not be established, ' + 'cause=' + cause.message)
    error.code = 'ECONNRESET'
    options.request.emit('error', error)
    self.removeSocket(placeholder)
  }
}

TunnelingAgent.prototype.removeSocket = function removeSocket(socket) {
  var pos = this.sockets.indexOf(socket)
  if (pos === -1) return
  
  this.sockets.splice(pos, 1)

  var pending = this.requests.shift()
  if (pending) {
    // If we have pending requests and a socket gets closed a new one
    // needs to be created to take over in the pool for the one that closed.
    this.createConnection(pending)
  }
}

function createSecureSocket(options, cb) {
  var self = this
  TunnelingAgent.prototype.createSocket.call(self, options, function(socket) {
    // 0 is dummy port for v0.6
    var secureSocket = tls.connect(0, mergeOptions({}, self.options, 
      { servername: options.host
      , socket: socket
      }
    ))
    self.sockets[self.sockets.indexOf(socket)] = secureSocket
    cb(secureSocket)
  })
}


function mergeOptions(target) {
  for (var i = 1, len = arguments.length; i < len; ++i) {
    var overrides = arguments[i]
    if (typeof overrides === 'object') {
      var keys = Object.keys(overrides)
      for (var j = 0, keyLen = keys.length; j < keyLen; ++j) {
        var k = keys[j]
        if (overrides[k] !== undefined) {
          target[k] = overrides[k]
        }
      }
    }
  }
  return target
}


var debug
if (process.env.NODE_DEBUG && /\btunnel\b/.test(process.env.NODE_DEBUG)) {
  debug = function() {
    var args = Array.prototype.slice.call(arguments)
    if (typeof args[0] === 'string') {
      args[0] = 'TUNNEL: ' + args[0]
    } else {
      args.unshift('TUNNEL:')
    }
    console.error.apply(console, args)
  }
} else {
  debug = function() {}
}
exports.debug = debug // for test

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":undefined,"assert":undefined,"buffer":undefined,"events":undefined,"http":undefined,"https":undefined,"net":undefined,"tls":undefined,"util":undefined}],12:[function(require,module,exports){
(function (global){
/*global unescape, module, define, window, global*/

/*
 UriTemplate Copyright (c) 2012-2013 Franz Antesberger. All Rights Reserved.
 Available via the MIT license.
*/

(function (exportCallback) {
    "use strict";

var UriTemplateError = (function () {

    function UriTemplateError (options) {
        this.options = options;
    }

    UriTemplateError.prototype.toString = function () {
        if (JSON && JSON.stringify) {
            return JSON.stringify(this.options);
        }
        else {
            return this.options;
        }
    };

    return UriTemplateError;
}());

var objectHelper = (function () {
    function isArray (value) {
        return Object.prototype.toString.apply(value) === '[object Array]';
    }

    function isString (value) {
        return Object.prototype.toString.apply(value) === '[object String]';
    }
    
    function isNumber (value) {
        return Object.prototype.toString.apply(value) === '[object Number]';
    }
    
    function isBoolean (value) {
        return Object.prototype.toString.apply(value) === '[object Boolean]';
    }
    
    function join (arr, separator) {
        var
            result = '',
            first = true,
            index;
        for (index = 0; index < arr.length; index += 1) {
            if (first) {
                first = false;
            }
            else {
                result += separator;
            }
            result += arr[index];
        }
        return result;
    }

    function map (arr, mapper) {
        var
            result = [],
            index = 0;
        for (; index < arr.length; index += 1) {
            result.push(mapper(arr[index]));
        }
        return result;
    }

    function filter (arr, predicate) {
        var
            result = [],
            index = 0;
        for (; index < arr.length; index += 1) {
            if (predicate(arr[index])) {
                result.push(arr[index]);
            }
        }
        return result;
    }

    function deepFreezeUsingObjectFreeze (object) {
        if (typeof object !== "object" || object === null) {
            return object;
        }
        Object.freeze(object);
        var property, propertyName;
        for (propertyName in object) {
            if (object.hasOwnProperty(propertyName)) {
                property = object[propertyName];
                // be aware, arrays are 'object', too
                if (typeof property === "object") {
                    deepFreeze(property);
                }
            }
        }
        return object;
    }

    function deepFreeze (object) {
        if (typeof Object.freeze === 'function') {
            return deepFreezeUsingObjectFreeze(object);
        }
        return object;
    }


    return {
        isArray: isArray,
        isString: isString,
        isNumber: isNumber,
        isBoolean: isBoolean,
        join: join,
        map: map,
        filter: filter,
        deepFreeze: deepFreeze
    };
}());

var charHelper = (function () {

    function isAlpha (chr) {
        return (chr >= 'a' && chr <= 'z') || ((chr >= 'A' && chr <= 'Z'));
    }

    function isDigit (chr) {
        return chr >= '0' && chr <= '9';
    }

    function isHexDigit (chr) {
        return isDigit(chr) || (chr >= 'a' && chr <= 'f') || (chr >= 'A' && chr <= 'F');
    }

    return {
        isAlpha: isAlpha,
        isDigit: isDigit,
        isHexDigit: isHexDigit
    };
}());

var pctEncoder = (function () {
    var utf8 = {
        encode: function (chr) {
            // see http://ecmanaut.blogspot.de/2006/07/encoding-decoding-utf8-in-javascript.html
            return unescape(encodeURIComponent(chr));
        },
        numBytes: function (firstCharCode) {
            if (firstCharCode <= 0x7F) {
                return 1;
            }
            else if (0xC2 <= firstCharCode && firstCharCode <= 0xDF) {
                return 2;
            }
            else if (0xE0 <= firstCharCode && firstCharCode <= 0xEF) {
                return 3;
            }
            else if (0xF0 <= firstCharCode && firstCharCode <= 0xF4) {
                return 4;
            }
            // no valid first octet
            return 0;
        },
        isValidFollowingCharCode: function (charCode) {
            return 0x80 <= charCode && charCode <= 0xBF;
        }
    };

    /**
     * encodes a character, if needed or not.
     * @param chr
     * @return pct-encoded character
     */
    function encodeCharacter (chr) {
        var
            result = '',
            octets = utf8.encode(chr),
            octet,
            index;
        for (index = 0; index < octets.length; index += 1) {
            octet = octets.charCodeAt(index);
            result += '%' + (octet < 0x10 ? '0' : '') + octet.toString(16).toUpperCase();
        }
        return result;
    }

    /**
     * Returns, whether the given text at start is in the form 'percent hex-digit hex-digit', like '%3F'
     * @param text
     * @param start
     * @return {boolean|*|*}
     */
    function isPercentDigitDigit (text, start) {
        return text.charAt(start) === '%' && charHelper.isHexDigit(text.charAt(start + 1)) && charHelper.isHexDigit(text.charAt(start + 2));
    }

    /**
     * Parses a hex number from start with length 2.
     * @param text a string
     * @param start the start index of the 2-digit hex number
     * @return {Number}
     */
    function parseHex2 (text, start) {
        return parseInt(text.substr(start, 2), 16);
    }

    /**
     * Returns whether or not the given char sequence is a correctly pct-encoded sequence.
     * @param chr
     * @return {boolean}
     */
    function isPctEncoded (chr) {
        if (!isPercentDigitDigit(chr, 0)) {
            return false;
        }
        var firstCharCode = parseHex2(chr, 1);
        var numBytes = utf8.numBytes(firstCharCode);
        if (numBytes === 0) {
            return false;
        }
        for (var byteNumber = 1; byteNumber < numBytes; byteNumber += 1) {
            if (!isPercentDigitDigit(chr, 3*byteNumber) || !utf8.isValidFollowingCharCode(parseHex2(chr, 3*byteNumber + 1))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Reads as much as needed from the text, e.g. '%20' or '%C3%B6'. It does not decode!
     * @param text
     * @param startIndex
     * @return the character or pct-string of the text at startIndex
     */
    function pctCharAt(text, startIndex) {
        var chr = text.charAt(startIndex);
        if (!isPercentDigitDigit(text, startIndex)) {
            return chr;
        }
        var utf8CharCode = parseHex2(text, startIndex + 1);
        var numBytes = utf8.numBytes(utf8CharCode);
        if (numBytes === 0) {
            return chr;
        }
        for (var byteNumber = 1; byteNumber < numBytes; byteNumber += 1) {
            if (!isPercentDigitDigit(text, startIndex + 3 * byteNumber) || !utf8.isValidFollowingCharCode(parseHex2(text, startIndex + 3 * byteNumber + 1))) {
                return chr;
            }
        }
        return text.substr(startIndex, 3 * numBytes);
    }

    return {
        encodeCharacter: encodeCharacter,
        isPctEncoded: isPctEncoded,
        pctCharAt: pctCharAt
    };
}());

var rfcCharHelper = (function () {

    /**
     * Returns if an character is an varchar character according 2.3 of rfc 6570
     * @param chr
     * @return (Boolean)
     */
    function isVarchar (chr) {
        return charHelper.isAlpha(chr) || charHelper.isDigit(chr) || chr === '_' || pctEncoder.isPctEncoded(chr);
    }

    /**
     * Returns if chr is an unreserved character according 1.5 of rfc 6570
     * @param chr
     * @return {Boolean}
     */
    function isUnreserved (chr) {
        return charHelper.isAlpha(chr) || charHelper.isDigit(chr) || chr === '-' || chr === '.' || chr === '_' || chr === '~';
    }

    /**
     * Returns if chr is an reserved character according 1.5 of rfc 6570
     * or the percent character mentioned in 3.2.1.
     * @param chr
     * @return {Boolean}
     */
    function isReserved (chr) {
        return chr === ':' || chr === '/' || chr === '?' || chr === '#' || chr === '[' || chr === ']' || chr === '@' || chr === '!' || chr === '$' || chr === '&' || chr === '(' ||
            chr === ')' || chr === '*' || chr === '+' || chr === ',' || chr === ';' || chr === '=' || chr === "'";
    }

    return {
        isVarchar: isVarchar,
        isUnreserved: isUnreserved,
        isReserved: isReserved
    };

}());

/**
 * encoding of rfc 6570
 */
var encodingHelper = (function () {

    function encode (text, passReserved) {
        var
            result = '',
            index,
            chr = '';
        if (typeof text === "number" || typeof text === "boolean") {
            text = text.toString();
        }
        for (index = 0; index < text.length; index += chr.length) {
            chr = text.charAt(index);
            result += rfcCharHelper.isUnreserved(chr) || (passReserved && rfcCharHelper.isReserved(chr)) ? chr : pctEncoder.encodeCharacter(chr);
        }
        return result;
    }

    function encodePassReserved (text) {
        return encode(text, true);
    }

    function encodeLiteralCharacter (literal, index) {
        var chr = pctEncoder.pctCharAt(literal, index);
        if (chr.length > 1) {
            return chr;
        }
        else {
            return rfcCharHelper.isReserved(chr) || rfcCharHelper.isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
        }
    }

    function encodeLiteral (literal) {
        var
            result = '',
            index,
            chr = '';
        for (index = 0; index < literal.length; index += chr.length) {
            chr = pctEncoder.pctCharAt(literal, index);
            if (chr.length > 1) {
                result += chr;
            }
            else {
                result += rfcCharHelper.isReserved(chr) || rfcCharHelper.isUnreserved(chr) ? chr : pctEncoder.encodeCharacter(chr);
            }
        }
        return result;
    }

    return {
        encode: encode,
        encodePassReserved: encodePassReserved,
        encodeLiteral: encodeLiteral,
        encodeLiteralCharacter: encodeLiteralCharacter
    };

}());


// the operators defined by rfc 6570
var operators = (function () {

    var
        bySymbol = {};

    function create (symbol) {
        bySymbol[symbol] = {
            symbol: symbol,
            separator: (symbol === '?') ? '&' : (symbol === '' || symbol === '+' || symbol === '#') ? ',' : symbol,
            named: symbol === ';' || symbol === '&' || symbol === '?',
            ifEmpty: (symbol === '&' || symbol === '?') ? '=' : '',
            first: (symbol === '+' ) ? '' : symbol,
            encode: (symbol === '+' || symbol === '#') ? encodingHelper.encodePassReserved : encodingHelper.encode,
            toString: function () {
                return this.symbol;
            }
        };
    }

    create('');
    create('+');
    create('#');
    create('.');
    create('/');
    create(';');
    create('?');
    create('&');
    return {
        valueOf: function (chr) {
            if (bySymbol[chr]) {
                return bySymbol[chr];
            }
            if ("=,!@|".indexOf(chr) >= 0) {
                return null;
            }
            return bySymbol[''];
        }
    };
}());


/**
 * Detects, whether a given element is defined in the sense of rfc 6570
 * Section 2.3 of the RFC makes clear defintions:
 * * undefined and null are not defined.
 * * the empty string is defined
 * * an array ("list") is defined, if it is not empty (even if all elements are not defined)
 * * an object ("map") is defined, if it contains at least one property with defined value
 * @param object
 * @return {Boolean}
 */
function isDefined (object) {
    var
        propertyName;
    if (object === null || object === undefined) {
        return false;
    }
    if (objectHelper.isArray(object)) {
        // Section 2.3: A variable defined as a list value is considered undefined if the list contains zero members
        return object.length > 0;
    }
    if (typeof object === "string" || typeof object === "number" || typeof object === "boolean") {
        // falsy values like empty strings, false or 0 are "defined"
        return true;
    }
    // else Object
    for (propertyName in object) {
        if (object.hasOwnProperty(propertyName) && isDefined(object[propertyName])) {
            return true;
        }
    }
    return false;
}

var LiteralExpression = (function () {
    function LiteralExpression (literal) {
        this.literal = encodingHelper.encodeLiteral(literal);
    }

    LiteralExpression.prototype.expand = function () {
        return this.literal;
    };

    LiteralExpression.prototype.toString = LiteralExpression.prototype.expand;

    return LiteralExpression;
}());

var parse = (function () {

    function parseExpression (expressionText) {
        var
            operator,
            varspecs = [],
            varspec = null,
            varnameStart = null,
            maxLengthStart = null,
            index,
            chr = '';

        function closeVarname () {
            var varname = expressionText.substring(varnameStart, index);
            if (varname.length === 0) {
                throw new UriTemplateError({expressionText: expressionText, message: "a varname must be specified", position: index});
            }
            varspec = {varname: varname, exploded: false, maxLength: null};
            varnameStart = null;
        }

        function closeMaxLength () {
            if (maxLengthStart === index) {
                throw new UriTemplateError({expressionText: expressionText, message: "after a ':' you have to specify the length", position: index});
            }
            varspec.maxLength = parseInt(expressionText.substring(maxLengthStart, index), 10);
            maxLengthStart = null;
        }

        operator = (function (operatorText) {
            var op = operators.valueOf(operatorText);
            if (op === null) {
                throw new UriTemplateError({expressionText: expressionText, message: "illegal use of reserved operator", position: index, operator: operatorText});
            }
            return op;
        }(expressionText.charAt(0)));
        index = operator.symbol.length;

        varnameStart = index;

        for (; index < expressionText.length; index += chr.length) {
            chr = pctEncoder.pctCharAt(expressionText, index);

            if (varnameStart !== null) {
                // the spec says: varname =  varchar *( ["."] varchar )
                // so a dot is allowed except for the first char
                if (chr === '.') {
                    if (varnameStart === index) {
                        throw new UriTemplateError({expressionText: expressionText, message: "a varname MUST NOT start with a dot", position: index});
                    }
                    continue;
                }
                if (rfcCharHelper.isVarchar(chr)) {
                    continue;
                }
                closeVarname();
            }
            if (maxLengthStart !== null) {
                if (index === maxLengthStart && chr === '0') {
                    throw new UriTemplateError({expressionText: expressionText, message: "A :prefix must not start with digit 0", position: index});
                }
                if (charHelper.isDigit(chr)) {
                    if (index - maxLengthStart >= 4) {
                        throw new UriTemplateError({expressionText: expressionText, message: "A :prefix must have max 4 digits", position: index});
                    }
                    continue;
                }
                closeMaxLength();
            }
            if (chr === ':') {
                if (varspec.maxLength !== null) {
                    throw new UriTemplateError({expressionText: expressionText, message: "only one :maxLength is allowed per varspec", position: index});
                }
                if (varspec.exploded) {
                    throw new UriTemplateError({expressionText: expressionText, message: "an exploeded varspec MUST NOT be varspeced", position: index});
                }
                maxLengthStart = index + 1;
                continue;
            }
            if (chr === '*') {
                if (varspec === null) {
                    throw new UriTemplateError({expressionText: expressionText, message: "exploded without varspec", position: index});
                }
                if (varspec.exploded) {
                    throw new UriTemplateError({expressionText: expressionText, message: "exploded twice", position: index});
                }
                if (varspec.maxLength) {
                    throw new UriTemplateError({expressionText: expressionText, message: "an explode (*) MUST NOT follow to a prefix", position: index});
                }
                varspec.exploded = true;
                continue;
            }
            // the only legal character now is the comma
            if (chr === ',') {
                varspecs.push(varspec);
                varspec = null;
                varnameStart = index + 1;
                continue;
            }
            throw new UriTemplateError({expressionText: expressionText, message: "illegal character", character: chr, position: index});
        } // for chr
        if (varnameStart !== null) {
            closeVarname();
        }
        if (maxLengthStart !== null) {
            closeMaxLength();
        }
        varspecs.push(varspec);
        return new VariableExpression(expressionText, operator, varspecs);
    }

    function parse (uriTemplateText) {
        // assert filled string
        var
            index,
            chr,
            expressions = [],
            braceOpenIndex = null,
            literalStart = 0;
        for (index = 0; index < uriTemplateText.length; index += 1) {
            chr = uriTemplateText.charAt(index);
            if (literalStart !== null) {
                if (chr === '}') {
                    throw new UriTemplateError({templateText: uriTemplateText, message: "unopened brace closed", position: index});
                }
                if (chr === '{') {
                    if (literalStart < index) {
                        expressions.push(new LiteralExpression(uriTemplateText.substring(literalStart, index)));
                    }
                    literalStart = null;
                    braceOpenIndex = index;
                }
                continue;
            }

            if (braceOpenIndex !== null) {
                // here just { is forbidden
                if (chr === '{') {
                    throw new UriTemplateError({templateText: uriTemplateText, message: "brace already opened", position: index});
                }
                if (chr === '}') {
                    if (braceOpenIndex + 1 === index) {
                        throw new UriTemplateError({templateText: uriTemplateText, message: "empty braces", position: braceOpenIndex});
                    }
                    try {
                        expressions.push(parseExpression(uriTemplateText.substring(braceOpenIndex + 1, index)));
                    }
                    catch (error) {
                        if (error.prototype === UriTemplateError.prototype) {
                            throw new UriTemplateError({templateText: uriTemplateText, message: error.options.message, position: braceOpenIndex + error.options.position, details: error.options});
                        }
                        throw error;
                    }
                    braceOpenIndex = null;
                    literalStart = index + 1;
                }
                continue;
            }
            throw new Error('reached unreachable code');
        }
        if (braceOpenIndex !== null) {
            throw new UriTemplateError({templateText: uriTemplateText, message: "unclosed brace", position: braceOpenIndex});
        }
        if (literalStart < uriTemplateText.length) {
            expressions.push(new LiteralExpression(uriTemplateText.substr(literalStart)));
        }
        return new UriTemplate(uriTemplateText, expressions);
    }

    return parse;
}());

var VariableExpression = (function () {
    // helper function if JSON is not available
    function prettyPrint (value) {
        return (JSON && JSON.stringify) ? JSON.stringify(value) : value;
    }

    function isEmpty (value) {
        if (!isDefined(value)) {
            return true;
        }
        if (objectHelper.isString(value)) {
            return value === '';
        }
        if (objectHelper.isNumber(value) || objectHelper.isBoolean(value)) {
            return false;
        }
        if (objectHelper.isArray(value)) {
            return value.length === 0;
        }
        for (var propertyName in value) {
            if (value.hasOwnProperty(propertyName)) {
                return false;
            }
        }
        return true;
    }

    function propertyArray (object) {
        var
            result = [],
            propertyName;
        for (propertyName in object) {
            if (object.hasOwnProperty(propertyName)) {
                result.push({name: propertyName, value: object[propertyName]});
            }
        }
        return result;
    }

    function VariableExpression (templateText, operator, varspecs) {
        this.templateText = templateText;
        this.operator = operator;
        this.varspecs = varspecs;
    }

    VariableExpression.prototype.toString = function () {
        return this.templateText;
    };

    function expandSimpleValue(varspec, operator, value) {
        var result = '';
        value = value.toString();
        if (operator.named) {
            result += encodingHelper.encodeLiteral(varspec.varname);
            if (value === '') {
                result += operator.ifEmpty;
                return result;
            }
            result += '=';
        }
        if (varspec.maxLength !== null) {
            value = value.substr(0, varspec.maxLength);
        }
        result += operator.encode(value);
        return result;
    }

    function valueDefined (nameValue) {
        return isDefined(nameValue.value);
    }

    function expandNotExploded(varspec, operator, value) {
        var
            arr = [],
            result = '';
        if (operator.named) {
            result += encodingHelper.encodeLiteral(varspec.varname);
            if (isEmpty(value)) {
                result += operator.ifEmpty;
                return result;
            }
            result += '=';
        }
        if (objectHelper.isArray(value)) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, operator.encode);
            result += objectHelper.join(arr, ',');
        }
        else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, valueDefined);
            arr = objectHelper.map(arr, function (nameValue) {
                return operator.encode(nameValue.name) + ',' + operator.encode(nameValue.value);
            });
            result += objectHelper.join(arr, ',');
        }
        return result;
    }

    function expandExplodedNamed (varspec, operator, value) {
        var
            isArray = objectHelper.isArray(value),
            arr = [];
        if (isArray) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, function (listElement) {
                var tmp = encodingHelper.encodeLiteral(varspec.varname);
                if (isEmpty(listElement)) {
                    tmp += operator.ifEmpty;
                }
                else {
                    tmp += '=' + operator.encode(listElement);
                }
                return tmp;
            });
        }
        else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, valueDefined);
            arr = objectHelper.map(arr, function (nameValue) {
                var tmp = encodingHelper.encodeLiteral(nameValue.name);
                if (isEmpty(nameValue.value)) {
                    tmp += operator.ifEmpty;
                }
                else {
                    tmp += '=' + operator.encode(nameValue.value);
                }
                return tmp;
            });
        }
        return objectHelper.join(arr, operator.separator);
    }

    function expandExplodedUnnamed (operator, value) {
        var
            arr = [],
            result = '';
        if (objectHelper.isArray(value)) {
            arr = value;
            arr = objectHelper.filter(arr, isDefined);
            arr = objectHelper.map(arr, operator.encode);
            result += objectHelper.join(arr, operator.separator);
        }
        else {
            arr = propertyArray(value);
            arr = objectHelper.filter(arr, function (nameValue) {
                return isDefined(nameValue.value);
            });
            arr = objectHelper.map(arr, function (nameValue) {
                return operator.encode(nameValue.name) + '=' + operator.encode(nameValue.value);
            });
            result += objectHelper.join(arr, operator.separator);
        }
        return result;
    }


    VariableExpression.prototype.expand = function (variables) {
        var
            expanded = [],
            index,
            varspec,
            value,
            valueIsArr,
            oneExploded = false,
            operator = this.operator;

        // expand each varspec and join with operator's separator
        for (index = 0; index < this.varspecs.length; index += 1) {
            varspec = this.varspecs[index];
            value = variables[varspec.varname];
            // if (!isDefined(value)) {
            // if (variables.hasOwnProperty(varspec.name)) {
            if (value === null || value === undefined) {
                continue;
            }
            if (varspec.exploded) {
                oneExploded = true;
            }
            valueIsArr = objectHelper.isArray(value);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                expanded.push(expandSimpleValue(varspec, operator, value));
            }
            else if (varspec.maxLength && isDefined(value)) {
                // 2.4.1 of the spec says: "Prefix modifiers are not applicable to variables that have composite values."
                throw new Error('Prefix modifiers are not applicable to variables that have composite values. You tried to expand ' + this + " with " + prettyPrint(value));
            }
            else if (!varspec.exploded) {
                if (operator.named || !isEmpty(value)) {
                    expanded.push(expandNotExploded(varspec, operator, value));
                }
            }
            else if (isDefined(value)) {
                if (operator.named) {
                    expanded.push(expandExplodedNamed(varspec, operator, value));
                }
                else {
                    expanded.push(expandExplodedUnnamed(operator, value));
                }
            }
        }

        if (expanded.length === 0) {
            return "";
        }
        else {
            return operator.first + objectHelper.join(expanded, operator.separator);
        }
    };

    return VariableExpression;
}());

var UriTemplate = (function () {
    function UriTemplate (templateText, expressions) {
        this.templateText = templateText;
        this.expressions = expressions;
        objectHelper.deepFreeze(this);
    }

    UriTemplate.prototype.toString = function () {
        return this.templateText;
    };

    UriTemplate.prototype.expand = function (variables) {
        // this.expressions.map(function (expression) {return expression.expand(variables);}).join('');
        var
            index,
            result = '';
        for (index = 0; index < this.expressions.length; index += 1) {
            result += this.expressions[index].expand(variables);
        }
        return result;
    };

    UriTemplate.parse = parse;
    UriTemplate.UriTemplateError = UriTemplateError;
    return UriTemplate;
}());

    exportCallback(UriTemplate);

}(function (UriTemplate) {
        "use strict";
        // export UriTemplate, when module is present, or pass it to window or global
        if (typeof module !== "undefined") {
            module.exports = UriTemplate;
        }
        else if (typeof define === "function") {
            define([],function() {
                return UriTemplate;
            });
        }
        else if (typeof window !== "undefined") {
            window.UriTemplate = UriTemplate;
        }
        else {
            global.UriTemplate = UriTemplate;
        }
    }
));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],13:[function(require,module,exports){
(function (global){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * ES6 global Promise shim
 */
var unhandledRejections = require('../lib/decorators/unhandledRejection');
var PromiseConstructor = unhandledRejections(require('../lib/Promise'));

module.exports = typeof global != 'undefined' ? (global.Promise = PromiseConstructor)
	           : typeof self   != 'undefined' ? (self.Promise   = PromiseConstructor)
	           : PromiseConstructor;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib/Promise":14,"../lib/decorators/unhandledRejection":16}],14:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./Scheduler');
	var async = require('./env').asap;

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./Scheduler":15,"./env":17,"./makePromise":19}],15:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	/**
	 * Async task scheduler
	 * @param {function} async function to schedule a single async function
	 * @constructor
	 */
	function Scheduler(async) {
		this._async = async;
		this._running = false;

		this._queue = this;
		this._queueLen = 0;
		this._afterQueue = {};
		this._afterQueueLen = 0;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._queue[this._queueLen++] = task;
		this.run();
	};

	/**
	 * Enqueue a task to run after the main task queue
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.afterQueue = function(task) {
		this._afterQueue[this._afterQueueLen++] = task;
		this.run();
	};

	Scheduler.prototype.run = function() {
		if (!this._running) {
			this._running = true;
			this._async(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, and then the after queue
	 */
	Scheduler.prototype._drain = function() {
		var i = 0;
		for (; i < this._queueLen; ++i) {
			this._queue[i].run();
			this._queue[i] = void 0;
		}

		this._queueLen = 0;
		this._running = false;

		for (i = 0; i < this._afterQueueLen; ++i) {
			this._afterQueue[i].run();
			this._afterQueue[i] = void 0;
		}

		this._afterQueueLen = 0;
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],16:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var setTimer = require('../env').setTimer;
	var format = require('../format');

	return function unhandledRejection(Promise) {

		var logError = noop;
		var logInfo = noop;
		var localConsole;

		if(typeof console !== 'undefined') {
			// Alias console to prevent things like uglify's drop_console option from
			// removing console.log/error. Unhandled rejections fall into the same
			// category as uncaught exceptions, and build tools shouldn't silence them.
			localConsole = console;
			logError = typeof localConsole.error !== 'undefined'
				? function (e) { localConsole.error(e); }
				: function (e) { localConsole.log(e); };

			logInfo = typeof localConsole.info !== 'undefined'
				? function (e) { localConsole.info(e); }
				: function (e) { localConsole.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = null;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + format.formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + format.formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(running === null) {
				running = setTimer(flush, 0);
			}
		}

		function flush() {
			running = null;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../env":17,"../format":18}],17:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global process,document,setTimeout,clearTimeout,MutationObserver,WebKitMutationObserver*/
(function(define) { 'use strict';
define(function(require) {
	/*jshint maxcomplexity:6*/

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// setTimeout, and finally vertx, since its the only env that doesn't
	// have setTimeout

	var MutationObs;
	var capturedSetTimeout = typeof setTimeout !== 'undefined' && setTimeout;

	// Default env
	var setTimer = function(f, ms) { return setTimeout(f, ms); };
	var clearTimer = function(t) { return clearTimeout(t); };
	var asap = function (f) { return capturedSetTimeout(f, 0); };

	// Detect specific env
	if (isNode()) { // Node
		asap = function (f) { return process.nextTick(f); };

	} else if (MutationObs = hasMutationObserver()) { // Modern browser
		asap = initMutationObserver(MutationObs);

	} else if (!capturedSetTimeout) { // vert.x
		var vertxRequire = require;
		var vertx = vertxRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
		asap = vertx.runOnLoop || vertx.runOnContext;
	}

	return {
		setTimer: setTimer,
		clearTimer: clearTimer,
		asap: asap
	};

	function isNode () {
		return typeof process !== 'undefined' &&
			Object.prototype.toString.call(process) === '[object process]';
	}

	function hasMutationObserver () {
		return (typeof MutationObserver === 'function' && MutationObserver) ||
			(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver);
	}

	function initMutationObserver(MutationObserver) {
		var scheduled;
		var node = document.createTextNode('');
		var o = new MutationObserver(run);
		o.observe(node, { characterData: true });

		function run() {
			var f = scheduled;
			scheduled = void 0;
			f();
		}

		var i = 0;
		return function (f) {
			scheduled = f;
			node.data = (i ^= 1);
		};
	}
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

}).call(this,require('_process'))
},{"_process":undefined}],18:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		formatError: formatError,
		formatObject: formatObject,
		tryStringify: tryStringify
	};

	/**
	 * Format an error into a string.  If e is an Error and has a stack property,
	 * it's returned.  Otherwise, e is formatted using formatObject, with a
	 * warning added about e not being a proper Error.
	 * @param {*} e
	 * @returns {String} formatted string, suitable for output to developers
	 */
	function formatError(e) {
		var s = typeof e === 'object' && e !== null && e.stack ? e.stack : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	/**
	 * Format an object, detecting "plain" objects and running them through
	 * JSON.stringify if possible.
	 * @param {Object} o
	 * @returns {string}
	 */
	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	/**
	 * Try to return the result of JSON.stringify(x).  If that fails, return
	 * defaultValue
	 * @param {*} x
	 * @param {*} defaultValue
	 * @returns {String|*} JSON.stringify(x) or defaultValue
	 */
	function tryStringify(x, defaultValue) {
		try {
			return JSON.stringify(x);
		} catch(e) {
			return defaultValue;
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],19:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;
		var emitRejection = initEmitRejection();

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {Pending}
		 */
		function init(resolver) {
			var handler = new Pending();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * @deprecated
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;
		Promise._handler = getHandler;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new Async(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new Async(new Rejected(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new Pending());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @param {function=} onProgress @deprecated progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
			var parent = this._handler;
			var state = parent.join().state();

			if ((typeof onFulfilled !== 'function' && state > 0) ||
				(typeof onRejected !== 'function' && state < 0)) {
				// Short circuit: value will not change, simply share handler
				return new this.constructor(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.chain(child, parent.receiver, onFulfilled, onRejected, onProgress);

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			return begetFrom(this._handler, this.constructor);
		};

		function begetFrom(parent, Promise) {
			var child = new Pending(parent.receiver, parent.join().context);
			return new Promise(Handler, child);
		}

		// Array combinators

		Promise.all = all;
		Promise.race = race;
		Promise._traverse = traverse;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			return traverseWith(snd, null, promises);
		}

		/**
		 * Array<Promise<X>> -> Promise<Array<f(X)>>
		 * @private
		 * @param {function} f function to apply to each promise's value
		 * @param {Array} promises array of promises
		 * @returns {Promise} promise for transformed values
		 */
		function traverse(f, promises) {
			return traverseWith(tryCatch2, f, promises);
		}

		function traverseWith(tryMap, f, promises) {
			var handler = typeof f === 'function' ? mapAt : settleAt;

			var resolver = new Pending();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			for (var i = 0, x; i < promises.length && !resolver.resolved; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				traverseAt(promises, handler, i, x, resolver);
			}

			if(pending === 0) {
				resolver.become(new Fulfilled(results));
			}

			return new Promise(Handler, resolver);

			function mapAt(i, x, resolver) {
				if(!resolver.resolved) {
					traverseAt(promises, settleAt, i, tryMap(f, x, i), resolver);
				}
			}

			function settleAt(i, x, resolver) {
				results[i] = x;
				if(--pending === 0) {
					resolver.become(new Fulfilled(results));
				}
			}
		}

		function traverseAt(promises, handler, i, x, resolver) {
			if (maybeThenable(x)) {
				var h = getHandlerMaybeThenable(x);
				var s = h.state();

				if (s === 0) {
					h.fold(handler, i, void 0, resolver);
				} else if (s > 0) {
					handler(i, h.value, resolver);
				} else {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
				}
			} else {
				handler(i, x, resolver);
			}
		}

		Promise._visitRemaining = visitRemaining;
		function visitRemaining(promises, start, handler) {
			for(var i=start; i<promises.length; ++i) {
				markAsHandled(getHandler(promises[i]), handler);
			}
		}

		function markAsHandled(h, handler) {
			if(h === handler) {
				return;
			}

			var s = h.state();
			if(s === 0) {
				h.visit(h, void 0, h._unreport);
			} else if(s < 0) {
				h._unreport();
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			if(typeof promises !== 'object' || promises === null) {
				return reject(new TypeError('non-iterable passed to race()'));
			}

			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			return promises.length === 0 ? never()
				 : promises.length === 1 ? resolve(promises[0])
				 : runRace(promises);
		}

		function runRace(promises) {
			var resolver = new Pending();
			var i, x, h;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x === void 0 && !(i in promises)) {
					continue;
				}

				h = getHandler(x);
				if(h.state() !== 0) {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
					break;
				} else {
					h.visit(resolver, resolver.resolve, resolver.reject);
				}
			}
			return new Promise(Handler, resolver);
		}

		// Promise internals
		// Below this, everything is @private

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
		}

		/**
		 * Get a handler for thenable x.
		 * NOTE: You must only call this if maybeThenable(x) == true
		 * @param {object|function|Promise} x
		 * @returns {object} handler
		 */
		function getHandlerMaybeThenable(x) {
			return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new Thenable(untrustedThen, x)
					: new Fulfilled(x);
			} catch(e) {
				return new Rejected(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.become
			= Handler.prototype.notify // deprecated
			= Handler.prototype.fail
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
			this.when({
				resolver: to,
				receiver: receiver,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
			this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
		};

		Handler.prototype.fold = function(f, z, c, to) {
			this.when(new Fold(f, z, c, to));
		};

		/**
		 * Handler that invokes fail() on any handler it becomes
		 * @constructor
		 */
		function FailIfRejected() {}

		inherit(Handler, FailIfRejected);

		FailIfRejected.prototype.become = function(h) {
			h.fail();
		};

		var failIfRejected = new FailIfRejected();

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @constructor
		 */
		function Pending(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, Pending);

		Pending.prototype._state = 0;

		Pending.prototype.resolve = function(x) {
			this.become(getHandler(x));
		};

		Pending.prototype.reject = function(x) {
			if(this.resolved) {
				return;
			}

			this.become(new Rejected(x));
		};

		Pending.prototype.join = function() {
			if (!this.resolved) {
				return this;
			}

			var h = this;

			while (h.handler !== void 0) {
				h = h.handler;
				if (h === this) {
					return this.handler = cycle();
				}
			}

			return h;
		};

		Pending.prototype.run = function() {
			var q = this.consumers;
			var handler = this.handler;
			this.handler = this.handler.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		Pending.prototype.become = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		Pending.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		/**
		 * @deprecated
		 */
		Pending.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(x, this));
			}
		};

		Pending.prototype.fail = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join().fail(c);
		};

		Pending.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		Pending.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @param {object} handler
		 * @constructor
		 */
		function Async(handler) {
			this.handler = handler;
		}

		inherit(Handler, Async);

		Async.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this));
		};

		Async.prototype._report = function(context) {
			this.join()._report(context);
		};

		Async.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function Thenable(then, thenable) {
			Pending.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(Pending, Thenable);

		/**
		 * Handler for a fulfilled promise
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function Fulfilled(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, Fulfilled);

		Fulfilled.prototype._state = 1;

		Fulfilled.prototype.fold = function(f, z, c, to) {
			runContinuation3(f, z, this, c, to);
		};

		Fulfilled.prototype.when = function(cont) {
			runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
		};

		var errorId = 0;

		/**
		 * Handler for a rejected promise
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function Rejected(x) {
			Promise.createContext(this);

			this.id = ++errorId;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, Rejected);

		Rejected.prototype._state = -1;

		Rejected.prototype.fold = function(f, z, c, to) {
			to.become(this);
		};

		Rejected.prototype.when = function(cont) {
			if(typeof cont.rejected === 'function') {
				this._unreport();
			}
			runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
		};

		Rejected.prototype._report = function(context) {
			tasks.afterQueue(new ReportTask(this, context));
		};

		Rejected.prototype._unreport = function() {
			if(this.handled) {
				return;
			}
			this.handled = true;
			tasks.afterQueue(new UnreportTask(this));
		};

		Rejected.prototype.fail = function(context) {
			this.reported = true;
			emitRejection('unhandledRejection', this);
			Promise.onFatalRejection(this, context === void 0 ? this.context : context);
		};

		function ReportTask(rejection, context) {
			this.rejection = rejection;
			this.context = context;
		}

		ReportTask.prototype.run = function() {
			if(!this.rejection.handled && !this.rejection.reported) {
				this.rejection.reported = true;
				emitRejection('unhandledRejection', this.rejection) ||
					Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
			}
		};

		function UnreportTask(rejection) {
			this.rejection = rejection;
		}

		UnreportTask.prototype.run = function() {
			if(this.rejection.reported) {
				emitRejection('rejectionHandled', this.rejection) ||
					Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
			}
		};

		// Unhandled rejection hooks
		// By default, everything is a noop

		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function cycle() {
			return new Rejected(new TypeError('Promise cycle'));
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @constructor
		 */
		function ProgressTask(value, handler) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}

			for (var c, i = 0; i < q.length; ++i) {
				c = q[i];
				runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
			}
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		/**
		 * Fold a handler value with z
		 * @constructor
		 */
		function Fold(f, z, c, to) {
			this.f = f; this.z = z; this.c = c; this.to = to;
			this.resolver = failIfRejected;
			this.receiver = this;
		}

		Fold.prototype.fulfilled = function(x) {
			this.f.call(this.c, this.z, x, this.to);
		};

		Fold.prototype.rejected = function(x) {
			this.to.reject(x);
		};

		Fold.prototype.progress = function(x) {
			this.to.notify(x);
		};

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} true iff x is a trusted Promise
		 */
		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Test just enough to rule out primitives, in order to take faster
		 * paths in some code
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function runContinuation1(f, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject(f, h.value, receiver, next);
			Promise.exitContext();
		}

		function runContinuation3(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject3(f, x, h.value, receiver, next);
			Promise.exitContext();
		}

		/**
		 * @deprecated
		 */
		function runNotify(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.notify(x);
			}

			Promise.enterContext(h);
			tryCatchReturn(f, x, receiver, next);
			Promise.exitContext();
		}

		function tryCatch2(f, a, b) {
			try {
				return f(a, b);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 */
		function tryCatchReject(f, x, thisArg, next) {
			try {
				next.become(getHandler(f.call(thisArg, x)));
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 */
		function tryCatchReject3(f, x, y, thisArg, next) {
			try {
				f.call(thisArg, x, y, next);
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * @deprecated
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 */
		function tryCatchReturn(f, x, thisArg, next) {
			try {
				next.notify(f.call(thisArg, x));
			} catch(e) {
				next.notify(e);
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function snd(x, y) {
			return y;
		}

		function noop() {}

		function initEmitRejection() {
			/*global process, self, CustomEvent*/
			if(typeof process !== 'undefined' && process !== null
				&& typeof process.emit === 'function') {
				// Returning falsy here means to call the default
				// onPotentiallyUnhandledRejection API.  This is safe even in
				// browserify since process.emit always returns falsy in browserify:
				// https://github.com/defunctzombie/node-process/blob/master/browser.js#L40-L46
				return function(type, rejection) {
					return type === 'unhandledRejection'
						? process.emit(type, rejection.value, rejection)
						: process.emit(type, rejection);
				};
			} else if(typeof self !== 'undefined' && typeof CustomEvent === 'function') {
				return (function(noop, self, CustomEvent) {
					var hasCustomEvent = false;
					try {
						var ev = new CustomEvent('unhandledRejection');
						hasCustomEvent = ev instanceof CustomEvent;
					} catch (e) {}

					return !hasCustomEvent ? noop : function(type, rejection) {
						var ev = new CustomEvent(type, {
							detail: {
								reason: rejection.value,
								key: rejection
							},
							bubbles: false,
							cancelable: true
						});

						return !self.dispatchEvent(ev);
					};
				}(noop, self, CustomEvent));
			}

			return noop;
		}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

}).call(this,require('_process'))
},{"_process":undefined}],20:[function(require,module,exports){
(function (process){
'use strict';
var url = require('url');
var tunnelAgent = require('tunnel-agent');

var FIDDLER_URL = 'http://127.0.0.1:8888';

var allowedHeaders = [
  'accept',
  'accept-charset',
  'accept-encoding',
  'accept-language',
  'accept-ranges',
  'cache-control',
  'content-encoding',
  'content-language',
  // 'content-length',
  'content-location',
  'content-md5',
  'content-range',
  'content-type',
  'connection',
  'date',
  'expect',
  'max-forwards',
  'pragma',
  'referer',
  'te',
  'transfer-encoding',
  'user-agent',
  'via'
].reduce(function(set, header) {
  set[header] = true;
  return set;
}, {});

var onlyHeaders = [
  'proxy-authorization'
];

var proxy = url.parse(FIDDLER_URL);

function makeProxyHeaders(headers) {
  return Object.keys(headers)
    .filter(function(header) {
      return allowedHeaders[header.toLowerCase()];
    })
    .reduce(function(set, header) {
      set[header] = headers[header];
      return set;
    }, {});
}


var agentFactories = {
  'https:https:': tunnelAgent.httpsOverHttps,
  'https:http:': tunnelAgent.httpsOverHttp,
  'http:https:': tunnelAgent.httpOverHttps,
  'http:http:': tunnelAgent.httpOverHttp
};
function getAgentFactory(targetProtocol, proxyProtocol) {
  return agentFactories[targetProtocol + proxyProtocol].bind(tunnelAgent);
}

function addFiddlerProxy(conf) {
  if (process.env.USE_FIDDLER) {
    conf.agent = getAgentFactory(conf.port === 443 ? 'https:' : 'http:', proxy.protocol)({
      proxy: {
        host: proxy.hostname,
        port: proxy.port,
        headers: makeProxyHeaders(conf.headers)
      },
      headers: conf.headers,
      rejectUnauthorized: false
    });
  }
  return conf;
}

module.exports = function FiddlerProxyPlugin(client) {
  var previous = client.requestTransform || function identity(x) { return x; };
  client.requestTransform = function(conf) {
    return addFiddlerProxy(previous(conf));
  };
};
}).call(this,require('_process'))
},{"_process":undefined,"tunnel-agent":11,"url":undefined}],21:[function(require,module,exports){
(function (process){
var assert = require('assert');

function isExpired(ticket) {
  var ungraceperiod = 60000;
  var compareDate = new Date();
  compareDate.setTime(compareDate.getTime() + ungraceperiod);
  return (new Date(ticket.refreshTokenExpiration)) < compareDate;
}

function generateCacheKey(claimtype, context) {
  var cmps;
  if (!process.env.mozuHosted) {
    assert(context.appKey, "No application key in context!");
    cmps = [context.appKey];
  } else {
    cmps = ['mozuHosted'];
  }
  switch(claimtype) {
    case "developer":
      assert(context.developerAccount && context.developerAccount.emailAddress, "No developer account email address in context!");
      cmps.push(context.developerAccount.emailAddress, context.developerAccountId);
      break;
    case "admin-user":
      assert(context.tenant, "No tenant in context!");
      assert(context.adminUser && context.adminUser.emailAddress, "No admin user email address in context!");
      cmps.push(context.tenant, context.adminUser.emailAddress);
      break;
    default:
      break;
  }
  return cmps.join();
}

var InMemoryAuthCache = module.exports = function InMemoryAuthCache() {
  var claimsCaches = {
    application: {},
    developer: {},
    'admin-user': {}
  };

  return {
    get: function(claimtype, context, callback) {
      var ticket = claimsCaches[claimtype][generateCacheKey(claimtype, context)];
      setImmediate(function() {
        callback(null, ticket && !isExpired(ticket) && ticket || undefined);
      });
    },
    set: function(claimtype, context, ticket, callback) {
      claimsCaches[claimtype][generateCacheKey(claimtype, context)] = ticket;
      setImmediate(callback);
    },
    constructor: InMemoryAuthCache
  };
};
}).call(this,require('_process'))
},{"_process":undefined,"assert":undefined}],22:[function(require,module,exports){
/* global Promise */
'use strict';
var constants = require('../constants'),
    AuthTicket = require('./auth-ticket'),
    scopes = constants.scopes;

require('when/es6-shim/Promise.browserify-es6');

var makeAppAuthClient = (function() {
  var c;
  return function() {
    return (c || (c = require('../clients/platform/applications/authTicket'))).apply(this, arguments);
  };
}());

var makeDeveloperAuthClient = (function() {
  var c;
  return function() {
    return (c || (c = require('../clients/platform/developer/developerAdminUserAuthTicket'))).apply(this, arguments);
  };
}());

var makeAdminUserAuthClient = (function() {
  var c;
  return function() {
    return (c || (c = require('../clients/platform/adminuser/tenantAdminUserAuthTicket'))).apply(this, arguments);
  };
}());

function getPlatformAuthTicket(client) {
  return makeAppAuthClient(client).authenticateApp({
    applicationId: client.context.appKey,
    sharedSecret: client.context.sharedSecret
  }, {
    scope: scopes.NONE
  }).then(AuthTicket);
}

function refreshPlatformAuthTicket(client, ticket) {
  return makeAppAuthClient(client).refreshAppAuthTicket({
    refreshToken: ticket.refreshToken
  }, {
    scope: scopes.NONE
  }).then(AuthTicket);
}

function getDeveloperAuthTicket(client) {
  return makeDeveloperAuthClient(client).createDeveloperUserAuthTicket(client.context.developerAccount).then(function(json) {
    return new AuthTicket(json);
  });
}

function refreshDeveloperAuthTicket(client, ticket) {
  return makeDeveloperAuthClient(client).refreshDeveloperAuthTicket(ticket).then(AuthTicket);
}

function getAdminUserAuthTicket(client) {
  return makeAdminUserAuthClient(client).createUserAuthTicket({ tenantId: client.context.tenant }, { 
    body: client.context.adminUser,
    scope: constants.scopes.APP_ONLY
  }).then(function(json) {
    client.context.user = json.user;
    return new AuthTicket(json);
  });
}

function refreshAdminUserAuthTicket(client, ticket) {
  return makeAdminUserAuthClient(client).refreshAuthTicket(ticket, {
    scope: constants.scopes.APP_ONLY
  }).then(AuthTicket);
}

var calleeToClaimType = {
  'addPlatformAppClaims': 'application',
  'addDeveloperUserClaims': 'developer',
  'addAdminUserClaims': 'admin-user'
};

function makeClaimMemoizer(calleeName, requester, refresher, claimHeader) {
  return function(client) {
    var cacheAndUpdateClient = function(ticket) {
      return new Promise(function(resolve) {
        client.authenticationStorage.set(calleeToClaimType[calleeName], client.context, ticket, function() {
          client.context[claimHeader] = ticket.accessToken;
          resolve(client);
        });
      });
    };
    var op = new Promise(function(resolve) {
      client.authenticationStorage.get(calleeToClaimType[calleeName], client.context, function(err, ticket) {
        resolve(ticket);
      });
    }).then(function(ticket) {
      if (!ticket) {
        return requester(client).then(cacheAndUpdateClient);
      }
      if ((new Date(ticket.accessTokenExpiration)) < new Date()) {
        return refresher(client, ticket).then(cacheAndUpdateClient);
      }
      client.context[claimHeader] = ticket.accessToken;
      return client;
    });
    function setRecent() {
      AuthProvider.addMostRecentUserClaims = AuthProvider[calleeName];
    }
    op.then(setRecent, setRecent);
    return op;
  };
}


var AuthProvider = {

  addPlatformAppClaims: makeClaimMemoizer('addPlatformAppClaims', getPlatformAuthTicket, refreshPlatformAuthTicket, constants.headers.APPCLAIMS),
  addDeveloperUserClaims: makeClaimMemoizer('addDeveloperUserClaims', getDeveloperAuthTicket, refreshDeveloperAuthTicket, constants.headers.USERCLAIMS),
  addAdminUserClaims: makeClaimMemoizer('addAdminUserClaims', getAdminUserAuthTicket, refreshAdminUserAuthTicket, constants.headers.USERCLAIMS),
  addMostRecentUserClaims: false
};

module.exports = AuthProvider;

},{"../clients/platform/adminuser/tenantAdminUserAuthTicket":6,"../clients/platform/applications/authTicket":7,"../clients/platform/developer/developerAdminUserAuthTicket":8,"../constants":10,"./auth-ticket":23,"when/es6-shim/Promise.browserify-es6":13}],23:[function(require,module,exports){

/**
 * The authentication ticket used to authenticate anything.
 * @class AuthTicket
 * @property {string} accessToken The token that stores an encrypted list of the application's configured behaviors and authenticates the application.
 * @property {Date} accessTokenExpiration Date and time the access token expires. After the access token expires, refresh the authentication ticket using the refresh token.
 * @property {string} refreshToken The token that refreshes the application's authentication ticket.
 * @property {Date} refreshTokenExpiration Date and time the refresh token expires. After the refresh token expires, generate a new authentication ticket.
 */
function AuthTicket(json) {
  var self = this;
  if (!(this instanceof AuthTicket)) return new AuthTicket(json);
  for (var p in json) {
    if (json.hasOwnProperty(p)) {
      self[p] = p.indexOf('Expiration') !== -1 ? new Date(json[p]) : json[p]; // dateify the dates, this'll break if the prop name changes
    }
  }
}

module.exports = AuthTicket;
},{}],24:[function(require,module,exports){
(function (Buffer){
var extend = require('./tiny-extend');
var util = require('util');
module.exports = function errorify(res, additions) {
  "use strict";
  try {
    if (typeof res === "string") {
      return new Error(res);
    }
    
    var err;
    var message = res.message || res.body && res.body.message;
    var stringBody = typeof res.body === "string" ? res.body : (Buffer.isBuffer(res.body) ? res.body.toString() : null);
    var details = typeof res.body === "object" ? res.body : (typeof res === "object" ? res : {});

    if (!message && stringBody) {
      try {
        details = JSON.parse(stringBody);
        message = details.message || stringBody;
      } catch(e) {
        message = stringBody;
      }
    }

    if (additions) {
      extend(details, additions);
    }

    message = (message || "Unknown error!") + formatDetails(details);

    err = new Error(message);
    err.originalError = details;
    return err;
  } catch(e) {
    return e;
  }
};

function formatDetails(deets) {
  return "\n\nDetails:\n" + Object.keys(deets).map(function(label) {
    var deet = deets[label];
    if (typeof deet === "object") deet = util.inspect(deet);
    return " " + label + ": " + deet;
  }).join('\n') + '\n';
}

}).call(this,require("buffer").Buffer)
},{"./tiny-extend":35,"buffer":undefined,"util":undefined}],25:[function(require,module,exports){
(function (process){
// BEGIN INIT
var fs = require('fs');
var findup = require('./tiny-findup');

var legalConfigNames = ['mozu.config','mozu.config.json'];

module.exports = function getConfig() {
  var conf;
  if (process.env.mozuHosted) {
    try {
      conf = JSON.parse(process.env.mozuHosted).sdkConfig;
    } catch(e) {
      throw new Error("Mozu hosted configuration was unreadable: " + e.message);
    }
  } else {
    for (var i = legalConfigNames.length - 1; i >= 0; i--) {
      try {
        var filename = findup(legalConfigNames[i]);
        if (filename) conf = fs.readFileSync(filename, 'utf-8');
      } catch(e) {}
      if (conf) break;
    }
    if (!conf) {
      throw new Error("No configuration file found. Either create a 'mozu.config' or 'mozu.config.json' file, or supply full config to the .client() method.");
    }
    try {
      conf = JSON.parse(conf);
    } catch(e) {
      throw new Error("Configuration file was unreadable: " + e.message);
    }
  }
  return conf;
};

}).call(this,require('_process'))
},{"./tiny-findup":36,"_process":undefined,"fs":undefined}],26:[function(require,module,exports){
(function (process){
'use strict';
var extend = require('./tiny-extend'),
    request = require('./request'),
    makeUrl = require('./make-url'),
    PrerequisiteManager = require('./prerequisite-manager'),
    pipeline = require('./promise-pipeline');

/**
 * Create an API method that runs a request based on a configuration and a body. The method handles and caches authentication automatically based on a provided scope, by delegating to AuthProvider where necessary.
 * @param {Object} config The configuration object used to create the method. Should include a URITemplate at `url`, optionally an HTTP verb at `method`, and optionally a scope from `constants.scopes` at `scope`.
 * @return {Function} A function that takes two parameters, a `body` object to be used as JSON payload, and optionally an `options` object to be sent to `request` to override default options. Expects to be run in the context of a Client.
 */
module.exports = function(config) {

  function doRequest(body, options) {
    options = options || {};
    var urlSpec = makeUrl(this, config.url, body);
    var finalRequestConfig = extend({}, config, this.defaultRequestOptions, {
      url: urlSpec.url,
      context: this.context,
      body: body
    }, options);
    var finalMethod = finalRequestConfig.method && finalRequestConfig.method.toUpperCase();
    var finalBody;
    if (body && 
        typeof body === "object" &&
        !Array.isArray(body) &&
        !options.body && 
        !options.includeUrlVariablesInPostBody && 
        (finalMethod === "POST" || finalMethod === "PUT")) {
      finalRequestConfig.body = Object.keys(body).reduce(function(m, k) {
        if (!urlSpec.keysUsed[k]) {
          m[k] = body[k];
        }
        return m;
      }, {});
      if (Object.keys(finalRequestConfig.body).length === 0) {
        delete finalRequestConfig.body;
      }
    }
    if (finalMethod === "GET" || finalMethod === "DELETE" && !options.body) {
      delete finalRequestConfig.body;
      // it's outlived its usefulness, we've already made a url with it
    }
    return request(finalRequestConfig, this.requestTransform);
  }

  return function(body, options) {
    var tasks;
    var doThisRequest = doRequest.bind(this, body, options);
    if (process.env.mozuHosted) {
      return doThisRequest();
    } else {
      tasks = PrerequisiteManager.getTasks(this, options, config) || [];
      tasks.push(doThisRequest);
      return pipeline(tasks);
      // this is more readable than the below, earlier version:
      // return pipeline((PrerequisiteManager.getTasks(this, options, config) || []).concat([doRequest.bind(this, body, options)]));
      // and no slower really
    }
  };

};


}).call(this,require('_process'))
},{"./make-url":27,"./prerequisite-manager":30,"./promise-pipeline":31,"./request":32,"./tiny-extend":35,"_process":undefined}],27:[function(require,module,exports){
'use strict';
var uritemplate = require('uritemplate'),
extend = require('./tiny-extend');

var templateCache = {};

function toKeysUsed(memo, expr) {
  if (expr.templateText) memo[expr.templateText] = true;
  return memo;
}

function ensureTrailingSlash(url) {
  return (url.charAt(url.length-1) === '/') ? url : (url + '/');
}

/**
 * Creates, evaluates based on context, and returns a string URL for a Mozu API request.
 * @param  {Object} context The context of a client. Should have a `baseUrl` property at minimum.
 * @param  {string} tpt     A string to be compiled into a UriTemplate. Should be a valid UriTemplate.
 * @param  {Object} body      An object consisting of the JSON body of the request, to be used to interpolate URL paramters.
 * @return {string}         A fully qualified URL.
 */
module.exports = function makeUrl(client, tpt, body) {
  var context = client.context,
    template = templateCache[tpt] && templateCache[tpt].template;
    if (!template) {
      template = uritemplate.parse(tpt);
      templateCache[tpt] = {
        template: template,
        keysUsed: template.expressions.reduce(toKeysUsed, {})
      };
    }
    var ctx = extend({
      homePod: context.baseUrl && ensureTrailingSlash(context.baseUrl),
      tenantId: context.tenant, // URI templates expect tenantId
      pciPod: context.basePciUrl && ensureTrailingSlash(context.basePciUrl)
    }, context, body || {});

  if (ctx.tenantPod) ctx.tenantPod = ensureTrailingSlash(ctx.tenantPod);

  // ensure the correct base url is present
  var baseVar = template.expressions[0];
  if (baseVar.operator && baseVar.operator.symbol === '+' && baseVar.varspecs && !ctx[baseVar.varspecs[0].varname]) {
    throw new Error('Could not make URL from template ' + tpt + '. Your context is missing a ' + baseVar.varspecs[0].varname + '.');
  } 

  return {
    url: template.expand(ctx),
    keysUsed: templateCache[tpt].keysUsed
  };
};

},{"./tiny-extend":35,"uritemplate":12}],28:[function(require,module,exports){
var extend = require('./tiny-extend');

var priorities = {
  'app-claims': ['appClaims'],
  'user-claims': ['userClaims'],
  'tenant': ['tenantId'],
  'site': ['siteId'],
  'master-catalog': ['masterCatalog','masterCatalogId'],
  'catalog': ['catalogId'],
  'dataview-mode': ['dataViewMode']
};

var prioritiesKeys = Object.keys(priorities);

module.exports = function(context) {
  var newContext = extend({}, context);
  return prioritiesKeys.reduce(function(ctx, dashKey) {
    return priorities[dashKey].reduce(function(ctx, k) {
      if (k in ctx) {
        ctx[dashKey] = ctx[k];
        delete ctx[k];
      }
      return ctx;
    }, ctx);
  }, newContext);
};

// var dashedProps = Object.keys(constants.headers).map(function(k) {
//   return constants.headers[k];
// });

// var camelToDash = dashedProps.reduce(function(t, dashed) {
//   t[camelCase(dashed)] = dashed;
//   return t;
// }, {});

// var camelToDashKeys = Object.keys(camelToDash);

// var specialProps =  {
//   tenantId: 'tenant',
//   siteId: 'site',
//   catalogId: 'catalog',
//   masterCatalogId: 'master-catalog'
// }

// var specialPropsKeys = Object.keys(specialProps);

// module.exports = function normalizeContext(context) {

//   return  addSpecialProps(
//             addCamelProps(
//               addDashedProps([extend({}, context), {}])
//             )
//           );
// }

// function addDashedProps(contextPair) {
//   return dashedProps.reduce(function(pair, k) {
//     var older = pair[0],
//         newer = pair[1];
//     if (k in older) {
//       newer[k] = older[k];
//       delete older[k];
//     }
//     return [older, newer];
//   }, contextPair);
// }
},{"./tiny-extend":35}],29:[function(require,module,exports){
'use strict';
var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
module.exports = function parseDate(key, value) {
  return (typeof value === 'string' && reISO.exec(value)) ? new Date(value) : value;
};

},{}],30:[function(require,module,exports){
var AuthProvider = require('../security/auth-provider'),
    scopes = require('../constants').scopes;

var tenantsCache = {};

var makeTenantClient = (function() {
  var c;
  return function() {
    return (c || (c = require('../clients/platform/tenant'))).apply(this, arguments);
  };
}());

function urlRequiresTenantPod(template) {
  return template.indexOf('{+tenantPod}') !== -1;
}

function urlRequiresPciPod(template) {
  return template.indexOf('{+pciPod}') !== -1;
}

function cacheTenantsFromTicket(ticket) {
  var tenants = ticket.availableTenants;
  if (tenants) {
    for (var i = 0; i < tenants.length; i++) {
      tenantsCache[tenants[i].id] = tenants[i];
    }
  }
  delete ticket.availableTenants;
  return ticket;
}

function getTenantInfo(id) {
  return tenantsCache[id];
}

  /**
 * Return an array of tasks (functions returning Promises) that performs, in sequence, all necessary authentication tasks for the given scope.
 * @param  {Client} client The client in whose context to run the tasks. AuthProvider will cache the claims per client.
 * @param  {Scope} scope  A scope (bitmask). If the scope is not NONE, then app claims will be added. If the scope is DEVELOPER xor ADMINUSER, user claims will be added.
 * @return {Array}        A list of tasks. If no auth is required, the list will be empty.
 */
 function getTasks(client, options, requestConfig) {

  var scope;
  // support a named scope, or a reference to a scope bitmask
  if (options && options.scope) {
    if (scopes[options.scope]) {
      scope = scopes[options.scope];
    } else {
      scope = options.scope;
    }
  } else {
    scope = requestConfig.scope;
  }

  var tasks = [];

  if (scope & scopes.DEVELOPER) {
    tasks.push(function() {
      return AuthProvider.addDeveloperUserClaims(client).then(cacheTenantsFromTicket);
    });
  } else if (scope & scopes.ADMINUSER) {
    tasks.push(function() {
      return AuthProvider.addAdminUserClaims(client).then(cacheTenantsFromTicket);
    });
  }
  if (!scope && AuthProvider.addMostRecentUserClaims) {
    tasks.push(function() {
      return AuthProvider.addMostRecentUserClaims(client);
    });
  }

  //if url requires a PCI pod but context is not set throw error
  if (urlRequiresPciPod(requestConfig.url)) {
    if (!client.context.tenant) {
      throw new Error("Could not perform request to PCI service '" + requestConfig.url + "'; no tenant ID was set.");
    }
  }

  // if url requires a tenant pod but we don't have one...
  var currentTenant;
  if (urlRequiresTenantPod(requestConfig.url) && !client.context.tenantPod) {
    if (!client.context.tenant) {
      throw new Error("Could not perform request to tenant-scoped service '" + requestConfig.url + "'; no tenant ID was set.");
    }
    currentTenant = getTenantInfo(client.context.tenant);
    if (currentTenant) {
      client.context.tenantPod = 'https://' + currentTenant.domain + '/';
    } else {
      tasks.push(function() {
        return makeTenantClient(client).getTenant().then(function(tenant) {
          tenantsCache[tenant.id] = tenant;
          client.context.tenantPod = 'https://' + tenant.domain + '/';
        });
      });
    }
  } 

  if (!(scope & scopes.NONE)) {
    tasks.push(function() {
      return AuthProvider.addPlatformAppClaims(client);
    });
  }

  return tasks;
}

module.exports = {
  getTasks: getTasks
};
},{"../clients/platform/tenant":9,"../constants":10,"../security/auth-provider":22}],31:[function(require,module,exports){
/* global Promise */
require('when/es6-shim/Promise.browserify-es6');


module.exports = function promisePipeline(tasks) {
  return tasks.reduce(function(p, task) {
    return p.then(task);
  }, Promise.resolve());
};
},{"when/es6-shim/Promise.browserify-es6":13}],32:[function(require,module,exports){
(function (process,Buffer){
/* global Promise */
var constants = require('../constants');
var extend = require('./tiny-extend');
var path = require('path');
var url = require('url');
var protocolHandlers = {
  'http:': require('http'),
  'https:': require('https')
};
var streamToCallback = require('./stream-to-callback');
var parseJsonDates = require('./parse-json-dates');
var errorify = require('./errorify');

require('when/es6-shim/Promise.browserify-es6');

var USER_AGENT = 'Mozu Node SDK v' + constants.version + ' (Node.js ' + process.version + '; ' + process.platform + ' ' + process.arch + ')';

/**
 * Handle headers
 */ 
function makeHeaders(conf, payload) {
  var headers;
  function iterateHeaders(memo, key) {
    if (conf.context[constants.headers[key]]) {
      memo[constants.headerPrefix + constants.headers[key]] = conf.context[constants.headers[key]];
    }
    return memo;
  }
  if (conf.scope && conf.scope & constants.scopes.NONE) {
    headers = {};
  } else if (conf.scope && conf.scope & constants.scopes.APP_ONLY) {
    headers = ['APPCLAIMS'].reduce(iterateHeaders, {});
  } else {
    headers = Object.keys(constants.headers).reduce(iterateHeaders, {});
  }

  if (payload) {
    headers['Content-Length'] = payload.length.toString();
  }

  return extend({
    'Accept': 'application/json',
    'Connection': 'close',
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': USER_AGENT,
  }, headers, conf.headers || {});
}

/**
 * Make an HTTP request to the Mozu API. This method populates headers based on the scope of the supplied context.
 * @param  {Object} options The request options, to be passed to the `request` module. Look up on NPM for details.
 * @return {Promise<ApiResponse,ApiError>}         A Promise that will fulfill as the JSON response from the API, or reject with an error as JSON from the API.
 */

module.exports = function(options, transform) {
  var conf = extend({}, options);
  conf.method = (conf.method || 'get').toUpperCase();
  var payload;
  if (conf.body) {
    payload = conf.body;
    if (typeof payload !== "string" && !Buffer.isBuffer(payload)) {
      payload = JSON.stringify(payload);
    }
  }
  conf.headers = makeHeaders(conf, payload);
  var uri = url.parse(conf.url);
  var protocolHandler = protocolHandlers[uri.protocol];
  if (!protocolHandler) {
    throw new Error('Protocol ' + uri.protocol + ' not supported.');
  }
  return new Promise(function(resolve, reject) {
    var requestOptions = extend({
      hostname: uri.hostname,
      port: uri.port || (uri.protocol === 'https:' ? 443 : 80),
      method: conf.method,
      path: uri.path,
      headers: conf.headers,
      agent: conf.agent
    }, options);
    if (typeof transform === "function") {
      requestOptions = transform(requestOptions); 
    }
    var complete = false;
    var request = protocolHandler.request(requestOptions, function(response) {
      streamToCallback(response, function(err, body) {
        complete = true;
        if (err) return reject(errorify(err, extend({ statusCode: response.statusCode}, response.headers)));
        if (body) {
          try {
            body = JSON.parse(body, (conf.parseDates !== false) && parseJsonDates);
          } catch(e) { 
            return reject(new Error('Response was not valid JSON: ' + e.message + '\n\n-----\n' + body));
          }
        }
        if (response && response.statusCode >= 400 && response.statusCode < 600) {
          return reject(errorify(body || response, extend({ statusCode: response.statusCode}, response.headers)));
        }
        return resolve(body);
      });
    });
    var timeout = options.timeout || 20000;
    request.setTimeout(timeout, function() {
      if (!complete) {
        request.abort();
        reject(errorify("Timeout occurred: request to " + conf.url + " took more than " + timeout / 1000 + " seconds to complete."));
      }
    });
    request.on('error', function(err) {
      reject(errorify(err, request));
    });
    if (payload) request.write(payload);
    request.end();
  });
};

}).call(this,require('_process'),require("buffer").Buffer)
},{"../constants":10,"./errorify":24,"./parse-json-dates":29,"./stream-to-callback":33,"./tiny-extend":35,"_process":undefined,"buffer":undefined,"http":undefined,"https":undefined,"path":undefined,"url":undefined,"when/es6-shim/Promise.browserify-es6":13}],33:[function(require,module,exports){
module.exports = function streamToCallback(stream, cb) {
  var buf = '';
  stream.setEncoding('utf8');
  stream.on('data', function(chunk) {
    buf += chunk;
  });
  stream.on('error', cb);
  stream.on('end', function() {
    cb(null, buf);
  });
};
},{}],34:[function(require,module,exports){
var util = require('util'),
    extend = require('./tiny-extend');

/**
 * Subclass a constructor. Like Node's `util.inherits` but lets you pass additions to the prototype, and composes constructors.
 * @param  {Function} cons  The constructor to subclass.
 * @param  {Object} proto Methods to add to the prototype.
 * @return {Function}       The new subclass.
 */
module.exports = function sub(cons, proto) {
  var child = function() {
      cons.apply(this, arguments);
  };
  util.inherits(child, cons);
  if (proto) extend(child.prototype, proto);
  return child;
};
},{"./tiny-extend":35,"util":undefined}],35:[function(require,module,exports){
module.exports = function extend(target) {
  return Array.prototype.slice.call(arguments,1).reduce(function(out, next) {
    if (next && typeof next === "object") {
      Object.keys(next).forEach(function(k) {
        out[k] = next[k];
      });
    }
    return out;
  }, target);
};
},{}],36:[function(require,module,exports){
(function (process){
var path = require('path');
var fs = require('fs');

module.exports = function findup(filename) {
  var maybeFile = path.resolve(filename),
      dir = process.cwd(),
      last,
      exists;
  while (!(exists = fs.existsSync(maybeFile)) && dir !== last) {
    maybeFile = path.resolve(dir, '..', filename);
    last = dir;
    dir = path.resolve(dir, '..');
  }
  return exists && maybeFile;
};
}).call(this,require('_process'))
},{"_process":undefined,"fs":undefined,"path":undefined}],37:[function(require,module,exports){
module.exports = {
  current: "1.18.15231.5"
};
},{}]},{},[2])(2)
});