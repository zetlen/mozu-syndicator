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

var syndicatorLibContents = "(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require==\"function\"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error(\"Cannot find module '\"+o+\"'\");throw f.code=\"MODULE_NOT_FOUND\",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require==\"function\"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){\n/* jshint loopfunc:true */\nvar Hypr = require('hypr');\nvar domready = require('domready');\n\nvar hyprMan = new Hypr.Manager({});\n\nfunction renderAll(resolved) {\n  for (var k in resolved) {\n    if (resolved.hasOwnProperty(k)) {\n      (function(template, results) {\n        var output = hyprMan.evaluate(template.textContent || template.innerText, { model: results });\n        var container = document.createElement('span');\n        container.innerHTML = output;\n        template.parentNode.insertBefore(container, template);\n      }(resolved[k].template, resolved[k].results));\n    }\n  }\n}\n\nvar ids = 0;\nfunction createId() {\n  return \"__mozu_syndicated_template\" + ids++;\n}\n\nfunction processScripts(scripts) {\n  \n  var queries = [];\n  var productQuery = {\n    id: 'products',\n    productCodes: []\n  };\n  var productCodeDispatch = {};\n  var templates = {};\n\n  for (var i = 0; i < scripts.length; i++) {\n    (function(script) {\n      var dataAttributes = {};\n      var id = createId();\n      if (script.getAttribute('type') === \"text/mozu-syndicated\") {\n\n        script.setAttribute('id', id);\n        templates[id] = script;\n\n        dataAttributes = {\n          productCode: script.getAttribute('data-mozu-product-code'),\n          productCodes: script.getAttribute('data-mozu-product-codes'),\n          filter: script.getAttribute('data-mozu-product-filter'),\n          query: script.getAttribute('data-mozu-product-query')\n        };\n\n        if (dataAttributes.productCode) {\n          productCodeDispatch[id] = dataAttributes.productCode;\n          productQuery.productCodes.push(dataAttributes.productCode);\n        } else if (dataAttributes.productCodes) {\n          productCodeDispatch[id] = dataAttributes.productCodes;\n          productQuery.productCodes = productQuery.productCodes.concat(dataAttributes.productCodes.split(','));\n        } else {\n          queries.push({\n            id: id,\n            filter: dataAttributes.filter,\n            query: dataAttributes.query\n          });\n        }\n      }  \n    }(scripts[i]));\n  }\n  if (productQuery.productCodes.length > 0) {\n    queries.push(productQuery);\n  }\n  return {\n    queries: queries,\n    productCodeDispatch: productCodeDispatch,\n    templates: templates\n  };\n}\n\nfunction getQueries(queries, cb) {\n  var url = MozuSyndicatedStore;\n  if (url.lastIndexOf('/') !== url.length-1) url += \"/\";\n  var callbackName = \"__mozu_syndicator_callback\" + (new Date()).getTime();\n  window[callbackName] = cb;\n  url += \"?callback=\" + callbackName;\n  url += \"&syndicate=\";\n  url += encodeURIComponent(JSON.stringify(queries));\n  var s = document.createElement('script');\n  s.src = url;\n  s.async = 1;\n  document.head.appendChild(s);\n}\n\ndomready(function() {\n\n\n  if (!window.MozuSyndicatedStore) {\n    throw new Error(\"Global MozuSyndicatedStore variable missing.\");\n  }\n\n  var scripts = document.getElementsByTagName('script');\n\n  var processed = processScripts(scripts);\n  var queries = processed.queries;\n  var productCodeDispatch = processed.productCodeDispatch;\n  var templates = processed.templates;\n\n  getQueries(queries, function(results) {\n    var resolved = [];\n    if (results.products) {\n      for (var d in productCodeDispatch) {\n        if (productCodeDispatch.hasOwnProperty(d)) {\n          if (typeof productCodeDispatch[d] === \"string\") {\n            resolved[d] = {\n              template: templates[d],\n              results: (function(prods) {\n                for (var j = 0; j < prods.length; j++) {\n                  if (prods[j].productCode === productCodeDispatch[d]) {\n                    return prods[j];\n                  }\n                }\n              }(results.products.items))\n            };\n          } else {\n            resolved[d] = {\n              template: templates[d],\n              results: {\n                items: (function(prods, codes) {\n                  var out = [];\n                  for (var j = 0; j < prods.length; j++) {\n                    for (var ii = 0;  ii < codes.length; ii++) {\n                      if (codes[ii] === prods[j].productCode) {\n                        out.push(prods[j]);\n                        break;\n                      }\n                    }\n                  }\n                  return out;\n                }(results.products.items, productCodeDispatch[d]))\n              }\n            };\n          }\n        }\n      } \n    } \n    delete results.products;\n    for (var resId in results) {\n      if (results.hasOwnProperty(resId)) {\n        resolved[resId] = {\n          template: templates[resId],\n          results: results[resId]\n        };\n      }\n    }\n    renderAll(resolved);\n  });\n\n});\n\n},{\"domready\":2,\"hypr\":17}],2:[function(require,module,exports){\n/*!\n  * domready (c) Dustin Diaz 2014 - License MIT\n  */\n!function (name, definition) {\n\n  if (typeof module != 'undefined') module.exports = definition()\n  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)\n  else this[name] = definition()\n\n}('domready', function () {\n\n  var fns = [], listener\n    , doc = document\n    , hack = doc.documentElement.doScroll\n    , domContentLoaded = 'DOMContentLoaded'\n    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)\n\n\n  if (!loaded)\n  doc.addEventListener(domContentLoaded, listener = function () {\n    doc.removeEventListener(domContentLoaded, listener)\n    loaded = 1\n    while (listener = fns.shift()) listener()\n  })\n\n  return function (fn) {\n    loaded ? setTimeout(fn, 0) : fns.push(fn)\n  }\n\n});\n\n},{}],3:[function(require,module,exports){\n\n},{}],4:[function(require,module,exports){\n// Copyright Joyent, Inc. and other Node contributors.\n//\n// Permission is hereby granted, free of charge, to any person obtaining a\n// copy of this software and associated documentation files (the\n// \"Software\"), to deal in the Software without restriction, including\n// without limitation the rights to use, copy, modify, merge, publish,\n// distribute, sublicense, and/or sell copies of the Software, and to permit\n// persons to whom the Software is furnished to do so, subject to the\n// following conditions:\n//\n// The above copyright notice and this permission notice shall be included\n// in all copies or substantial portions of the Software.\n//\n// THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS\n// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\n// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN\n// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,\n// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR\n// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE\n// USE OR OTHER DEALINGS IN THE SOFTWARE.\n\nfunction EventEmitter() {\n  this._events = this._events || {};\n  this._maxListeners = this._maxListeners || undefined;\n}\nmodule.exports = EventEmitter;\n\n// Backwards-compat with node 0.10.x\nEventEmitter.EventEmitter = EventEmitter;\n\nEventEmitter.prototype._events = undefined;\nEventEmitter.prototype._maxListeners = undefined;\n\n// By default EventEmitters will print a warning if more than 10 listeners are\n// added to it. This is a useful default which helps finding memory leaks.\nEventEmitter.defaultMaxListeners = 10;\n\n// Obviously not all Emitters should be limited to 10. This function allows\n// that to be increased. Set to zero for unlimited.\nEventEmitter.prototype.setMaxListeners = function(n) {\n  if (!isNumber(n) || n < 0 || isNaN(n))\n    throw TypeError('n must be a positive number');\n  this._maxListeners = n;\n  return this;\n};\n\nEventEmitter.prototype.emit = function(type) {\n  var er, handler, len, args, i, listeners;\n\n  if (!this._events)\n    this._events = {};\n\n  // If there is no 'error' event listener then throw.\n  if (type === 'error') {\n    if (!this._events.error ||\n        (isObject(this._events.error) && !this._events.error.length)) {\n      er = arguments[1];\n      if (er instanceof Error) {\n        throw er; // Unhandled 'error' event\n      }\n      throw TypeError('Uncaught, unspecified \"error\" event.');\n    }\n  }\n\n  handler = this._events[type];\n\n  if (isUndefined(handler))\n    return false;\n\n  if (isFunction(handler)) {\n    switch (arguments.length) {\n      // fast cases\n      case 1:\n        handler.call(this);\n        break;\n      case 2:\n        handler.call(this, arguments[1]);\n        break;\n      case 3:\n        handler.call(this, arguments[1], arguments[2]);\n        break;\n      // slower\n      default:\n        len = arguments.length;\n        args = new Array(len - 1);\n        for (i = 1; i < len; i++)\n          args[i - 1] = arguments[i];\n        handler.apply(this, args);\n    }\n  } else if (isObject(handler)) {\n    len = arguments.length;\n    args = new Array(len - 1);\n    for (i = 1; i < len; i++)\n      args[i - 1] = arguments[i];\n\n    listeners = handler.slice();\n    len = listeners.length;\n    for (i = 0; i < len; i++)\n      listeners[i].apply(this, args);\n  }\n\n  return true;\n};\n\nEventEmitter.prototype.addListener = function(type, listener) {\n  var m;\n\n  if (!isFunction(listener))\n    throw TypeError('listener must be a function');\n\n  if (!this._events)\n    this._events = {};\n\n  // To avoid recursion in the case that type === \"newListener\"! Before\n  // adding it to the listeners, first emit \"newListener\".\n  if (this._events.newListener)\n    this.emit('newListener', type,\n              isFunction(listener.listener) ?\n              listener.listener : listener);\n\n  if (!this._events[type])\n    // Optimize the case of one listener. Don't need the extra array object.\n    this._events[type] = listener;\n  else if (isObject(this._events[type]))\n    // If we've already got an array, just append.\n    this._events[type].push(listener);\n  else\n    // Adding the second element, need to change to array.\n    this._events[type] = [this._events[type], listener];\n\n  // Check for listener leak\n  if (isObject(this._events[type]) && !this._events[type].warned) {\n    var m;\n    if (!isUndefined(this._maxListeners)) {\n      m = this._maxListeners;\n    } else {\n      m = EventEmitter.defaultMaxListeners;\n    }\n\n    if (m && m > 0 && this._events[type].length > m) {\n      this._events[type].warned = true;\n      console.error('(node) warning: possible EventEmitter memory ' +\n                    'leak detected. %d listeners added. ' +\n                    'Use emitter.setMaxListeners() to increase limit.',\n                    this._events[type].length);\n      if (typeof console.trace === 'function') {\n        // not supported in IE 10\n        console.trace();\n      }\n    }\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.on = EventEmitter.prototype.addListener;\n\nEventEmitter.prototype.once = function(type, listener) {\n  if (!isFunction(listener))\n    throw TypeError('listener must be a function');\n\n  var fired = false;\n\n  function g() {\n    this.removeListener(type, g);\n\n    if (!fired) {\n      fired = true;\n      listener.apply(this, arguments);\n    }\n  }\n\n  g.listener = listener;\n  this.on(type, g);\n\n  return this;\n};\n\n// emits a 'removeListener' event iff the listener was removed\nEventEmitter.prototype.removeListener = function(type, listener) {\n  var list, position, length, i;\n\n  if (!isFunction(listener))\n    throw TypeError('listener must be a function');\n\n  if (!this._events || !this._events[type])\n    return this;\n\n  list = this._events[type];\n  length = list.length;\n  position = -1;\n\n  if (list === listener ||\n      (isFunction(list.listener) && list.listener === listener)) {\n    delete this._events[type];\n    if (this._events.removeListener)\n      this.emit('removeListener', type, listener);\n\n  } else if (isObject(list)) {\n    for (i = length; i-- > 0;) {\n      if (list[i] === listener ||\n          (list[i].listener && list[i].listener === listener)) {\n        position = i;\n        break;\n      }\n    }\n\n    if (position < 0)\n      return this;\n\n    if (list.length === 1) {\n      list.length = 0;\n      delete this._events[type];\n    } else {\n      list.splice(position, 1);\n    }\n\n    if (this._events.removeListener)\n      this.emit('removeListener', type, listener);\n  }\n\n  return this;\n};\n\nEventEmitter.prototype.removeAllListeners = function(type) {\n  var key, listeners;\n\n  if (!this._events)\n    return this;\n\n  // not listening for removeListener, no need to emit\n  if (!this._events.removeListener) {\n    if (arguments.length === 0)\n      this._events = {};\n    else if (this._events[type])\n      delete this._events[type];\n    return this;\n  }\n\n  // emit removeListener for all listeners on all events\n  if (arguments.length === 0) {\n    for (key in this._events) {\n      if (key === 'removeListener') continue;\n      this.removeAllListeners(key);\n    }\n    this.removeAllListeners('removeListener');\n    this._events = {};\n    return this;\n  }\n\n  listeners = this._events[type];\n\n  if (isFunction(listeners)) {\n    this.removeListener(type, listeners);\n  } else {\n    // LIFO order\n    while (listeners.length)\n      this.removeListener(type, listeners[listeners.length - 1]);\n  }\n  delete this._events[type];\n\n  return this;\n};\n\nEventEmitter.prototype.listeners = function(type) {\n  var ret;\n  if (!this._events || !this._events[type])\n    ret = [];\n  else if (isFunction(this._events[type]))\n    ret = [this._events[type]];\n  else\n    ret = this._events[type].slice();\n  return ret;\n};\n\nEventEmitter.listenerCount = function(emitter, type) {\n  var ret;\n  if (!emitter._events || !emitter._events[type])\n    ret = 0;\n  else if (isFunction(emitter._events[type]))\n    ret = 1;\n  else\n    ret = emitter._events[type].length;\n  return ret;\n};\n\nfunction isFunction(arg) {\n  return typeof arg === 'function';\n}\n\nfunction isNumber(arg) {\n  return typeof arg === 'number';\n}\n\nfunction isObject(arg) {\n  return typeof arg === 'object' && arg !== null;\n}\n\nfunction isUndefined(arg) {\n  return arg === void 0;\n}\n\n},{}],5:[function(require,module,exports){\n(function (process){\n// Copyright Joyent, Inc. and other Node contributors.\n//\n// Permission is hereby granted, free of charge, to any person obtaining a\n// copy of this software and associated documentation files (the\n// \"Software\"), to deal in the Software without restriction, including\n// without limitation the rights to use, copy, modify, merge, publish,\n// distribute, sublicense, and/or sell copies of the Software, and to permit\n// persons to whom the Software is furnished to do so, subject to the\n// following conditions:\n//\n// The above copyright notice and this permission notice shall be included\n// in all copies or substantial portions of the Software.\n//\n// THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS\n// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\n// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN\n// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,\n// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR\n// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE\n// USE OR OTHER DEALINGS IN THE SOFTWARE.\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length - 1; i >= 0; i--) {\n    var last = parts[i];\n    if (last === '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Split a filename into [root, dir, basename, ext], unix version\n// 'root' is just a slash, or nothing.\nvar splitPathRe =\n    /^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/;\nvar splitPath = function(filename) {\n  return splitPathRe.exec(filename).slice(1);\n};\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\n  var resolvedPath = '',\n      resolvedAbsolute = false;\n\n  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {\n    var path = (i >= 0) ? arguments[i] : process.cwd();\n\n    // Skip empty and invalid entries\n    if (typeof path !== 'string') {\n      throw new TypeError('Arguments to path.resolve must be strings');\n    } else if (!path) {\n      continue;\n    }\n\n    resolvedPath = path + '/' + resolvedPath;\n    resolvedAbsolute = path.charAt(0) === '/';\n  }\n\n  // At this point the path should be resolved to a full absolute path, but\n  // handle relative paths to be safe (might happen when process.cwd() fails)\n\n  // Normalize the path\n  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\n  var isAbsolute = exports.isAbsolute(path),\n      trailingSlash = substr(path, -1) === '/';\n\n  // Normalize the path\n  path = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n\n  return (isAbsolute ? '/' : '') + path;\n};\n\n// posix version\nexports.isAbsolute = function(path) {\n  return path.charAt(0) === '/';\n};\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    if (typeof p !== 'string') {\n      throw new TypeError('Arguments to path.join must be strings');\n    }\n    return p;\n  }).join('/'));\n};\n\n\n// path.relative(from, to)\n// posix version\nexports.relative = function(from, to) {\n  from = exports.resolve(from).substr(1);\n  to = exports.resolve(to).substr(1);\n\n  function trim(arr) {\n    var start = 0;\n    for (; start < arr.length; start++) {\n      if (arr[start] !== '') break;\n    }\n\n    var end = arr.length - 1;\n    for (; end >= 0; end--) {\n      if (arr[end] !== '') break;\n    }\n\n    if (start > end) return [];\n    return arr.slice(start, end - start + 1);\n  }\n\n  var fromParts = trim(from.split('/'));\n  var toParts = trim(to.split('/'));\n\n  var length = Math.min(fromParts.length, toParts.length);\n  var samePartsLength = length;\n  for (var i = 0; i < length; i++) {\n    if (fromParts[i] !== toParts[i]) {\n      samePartsLength = i;\n      break;\n    }\n  }\n\n  var outputParts = [];\n  for (var i = samePartsLength; i < fromParts.length; i++) {\n    outputParts.push('..');\n  }\n\n  outputParts = outputParts.concat(toParts.slice(samePartsLength));\n\n  return outputParts.join('/');\n};\n\nexports.sep = '/';\nexports.delimiter = ':';\n\nexports.dirname = function(path) {\n  var result = splitPath(path),\n      root = result[0],\n      dir = result[1];\n\n  if (!root && !dir) {\n    // No dirname whatsoever\n    return '.';\n  }\n\n  if (dir) {\n    // It has a dirname, strip trailing slash\n    dir = dir.substr(0, dir.length - 1);\n  }\n\n  return root + dir;\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPath(path)[2];\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPath(path)[3];\n};\n\nfunction filter (xs, f) {\n    if (xs.filter) return xs.filter(f);\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (f(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// String.prototype.substr - negative index don't work in IE8\nvar substr = 'ab'.substr(-1) === 'b'\n    ? function (str, start, len) { return str.substr(start, len) }\n    : function (str, start, len) {\n        if (start < 0) start = str.length + start;\n        return str.substr(start, len);\n    }\n;\n\n}).call(this,require('_process'))\n},{\"_process\":6}],6:[function(require,module,exports){\n// shim for using process in browser\n\nvar process = module.exports = {};\nvar queue = [];\nvar draining = false;\nvar currentQueue;\nvar queueIndex = -1;\n\nfunction cleanUpNextTick() {\n    draining = false;\n    if (currentQueue.length) {\n        queue = currentQueue.concat(queue);\n    } else {\n        queueIndex = -1;\n    }\n    if (queue.length) {\n        drainQueue();\n    }\n}\n\nfunction drainQueue() {\n    if (draining) {\n        return;\n    }\n    var timeout = setTimeout(cleanUpNextTick);\n    draining = true;\n\n    var len = queue.length;\n    while(len) {\n        currentQueue = queue;\n        queue = [];\n        while (++queueIndex < len) {\n            if (currentQueue) {\n                currentQueue[queueIndex].run();\n            }\n        }\n        queueIndex = -1;\n        len = queue.length;\n    }\n    currentQueue = null;\n    draining = false;\n    clearTimeout(timeout);\n}\n\nprocess.nextTick = function (fun) {\n    var args = new Array(arguments.length - 1);\n    if (arguments.length > 1) {\n        for (var i = 1; i < arguments.length; i++) {\n            args[i - 1] = arguments[i];\n        }\n    }\n    queue.push(new Item(fun, args));\n    if (queue.length === 1 && !draining) {\n        setTimeout(drainQueue, 0);\n    }\n};\n\n// v8 likes predictible objects\nfunction Item(fun, array) {\n    this.fun = fun;\n    this.array = array;\n}\nItem.prototype.run = function () {\n    this.fun.apply(null, this.array);\n};\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\nprocess.version = ''; // empty string to avoid regexp issues\nprocess.versions = {};\n\nfunction noop() {}\n\nprocess.on = noop;\nprocess.addListener = noop;\nprocess.once = noop;\nprocess.off = noop;\nprocess.removeListener = noop;\nprocess.removeAllListeners = noop;\nprocess.emit = noop;\n\nprocess.binding = function (name) {\n    throw new Error('process.binding is not supported');\n};\n\nprocess.cwd = function () { return '/' };\nprocess.chdir = function (dir) {\n    throw new Error('process.chdir is not supported');\n};\nprocess.umask = function() { return 0; };\n\n},{}],7:[function(require,module,exports){\nfunction addUrlParam(url, param, value) {\n    return url + (url.indexOf('?') === -1 ? '?' : '&') + encodeURIComponent(param) + '=' + encodeURIComponent(value);\n};\nmodule.exports = function() {\n  return addUrlParam;\n};\n\n},{}],8:[function(require,module,exports){\nfunction formatMoney(n, decPlaces, thouSeparator, decSeparator, symbol, symbolIsSuffix, roundUp) {\n    var sign, i, j, s, om;\n    decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces;\n    om = Math.pow(10, decPlaces);\n    symbol = symbol || \"$\";\n    decSeparator = decSeparator == undefined ? \".\" : decSeparator;\n    thouSeparator = thouSeparator == undefined ? \",\" : thouSeparator;\n    sign = n < 0 ? \"-\" : \"\";\n    i = parseInt(n = (Math.round(om * Math.abs(+n || 0)) / om), 10) + \"\";\n    j = (j = i.length) > 3 ? j % 3 : 0;\n        s = (j ? i.substr(0, j) + thouSeparator : \"\") + i.substr(j).replace(/(\\d{3})(?=\\d)/g, \"$1\" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : \"\");\n    return sign + (symbolIsSuffix ? s + symbol : symbol + s);\n}\n\nvar currencyInfo,\n    RoundingTypeConst = {\n        UpToCurrencyPrecision: 'upToCurrencyPrecision'\n    };\n\nmodule.exports = function(manager) {\n    return function(num, symbol) {\n        if (!currencyInfo) {\n            try {\n                currencyInfo = manager.context.locals.siteContext.currencyInfo;\n            } catch (e) {\n                currencyInfo = {\n                    symbol: '$',\n                    precision: 2,\n                    roundingType: 'upToCurrencyPrecision'\n                };\n            }\n        }\n        return formatMoney(num, currencyInfo.precision, null, null, symbol || currencyInfo.symbol, false, currencyInfo.roundingType === RoundingTypeConst.UpToCurrencyPrecision);\n    };\n};\n},{}],9:[function(require,module,exports){\nfunction divisibleBy(num, divisor) {\n  return num && num % divisor === 0;\n}\nmodule.exports = function() {\n  return divisibleBy;\n};\n},{}],10:[function(require,module,exports){\nvar prop = require('./prop')();\nfunction findWhere(list, k, v, caseSensitive) {\n    var length = list.length;\n    var o;\n    for (var i = 0; i < length; i++) {\n        o = prop(list[i], k, caseSensitive);\n        if (typeof o !== \"undefined\" && ((caseSensitive && o === v) || o.toString().toLowerCase() === v.toString().toLowerCase())) return list[i];\n    }\n}\nmodule.exports = function() {\n  return findWhere;\n};\n},{\"./prop\":13}],11:[function(require,module,exports){\nvar findWhere = require('./findwhere')();\nfunction getProductAttribute(product, attributeName) {\n  return findWhere(product.properties.concat(product.options), 'attributeFQN', attributeName);\n}\nmodule.exports = function() {\n  return getProductAttribute;\n}\n},{\"./findwhere\":10}],12:[function(require,module,exports){\nvar prop = require('./prop')();\nvar getProductAttribute = require('./get_product_attribute')();\nfunction getProductAttributeValue(product, attributeName, attributeValue) {\n    var attr = getProductAttribute(product, attributeName), values, value;\n    if (attr) {\n        values = prop(attr, 'values', true);\n        if (values) {\n            value = values[0];\n            return prop(value, 'stringValue', true) || prop(value, 'value', true)\n        }\n    }\n    return '';\n}\nmodule.exports = function() {\n    return getProductAttributeValue;\n}\n},{\"./get_product_attribute\":11,\"./prop\":13}],13:[function(require,module,exports){\nfunction prop(o, pn, caseSensitive) {\n  if (o) {\n    if (caseSensitive) return o[pn];\n    pn = pn.toLowerCase();\n    for (var k in o) {\n      if (pn === k.toLowerCase()) return o[k];\n    }\n  }\n  return '';\n}\nmodule.exports = function() {\n  return prop;\n};\n},{}],14:[function(require,module,exports){\nvar trimRE = /^\\s+|\\s+$/g,\n    invalidCharsRE = /[^a-z0-9 -]/g,\n    collapseWhitespaceRE = /\\s+/g,\n    collapseDashRE = /-+/g,\n    accentREs = [],\n    accentFrom = \"àáäâèéëêìíïîòóöôùúüûñç·/_,:;\".split(''),\n    accentTo = \"aaaaeeeeiiiioooouuuunc------\".split('');\n\nfor (var i = 0, l = accentFrom.length; i < l; i++) {\n    accentREs[i] = new RegExp(accentFrom[i], 'g');\n}\n\nfunction slugify(str) {\n    str = str.toString().replace(trimRE,'').toLowerCase();\n\n    for (var j=0, k=accentFrom.length ; j<k ; j++) {\n        str = str.replace(accentREs[j], accentTo[j]);\n    }\n\n    str = str.replace(invalidCharsRE, '-') // remove invalid chars\n      .replace(collapseWhitespaceRE, '-') // collapse whitespace and replace by -\n      .replace(collapseDashRE, '-'); // collapse dashes\n\n    return str;\n}\nmodule.exports = function() {\n    return slugify;\n};\n},{}],15:[function(require,module,exports){\nfunction stringFormat(tpt) {\n  var formatted = tpt, otherArgs = Array.prototype.slice.call(arguments, 1);\n  for (var i = 0, len = otherArgs.length; i < len; i++) {\n      formatted = formatted.split('{' + i + '}').join(otherArgs[i]);\n  }\n  return formatted;\n}\nmodule.exports = function() {\n  return stringFormat;\n};\n},{}],16:[function(require,module,exports){\nfunction truncateWords (str, num) {\n  var words = str.split(' ');\n  str = words.slice(0, num).join(' ');\n  if (words.length > num) str += \" ...\";\n  return str;\n};\nmodule.exports = function(manager) {\n  return truncateWords;\n};\n},{}],17:[function(require,module,exports){\nvar Manager = require('./manager');\n\nmodule.exports = {\n  Manager: Manager\n};\n},{\"./manager\":18}],18:[function(require,module,exports){\nvar swig = require('swig');\nvar inherits = require('inherits');\nvar EE = require('events').EventEmitter;\n\nvar filters = {\n  currency: require('./filters/currency'),\n  divisibleby: require('./filters/divisibleby'),\n  add_url_param: require('./filters/add_url_param'),\n  slugify: require('./filters/slugify'),\n  truncatewords: require('./filters/truncatewords'),\n  string_format: require('./filters/string_format'),\n  findwhere: require('./filters/findwhere'),\n  prop: require('./filters/prop'),\n  get_product_attribute: require('./filters/get_product_attribute'),\n  get_product_attribute_value: require('./filters/get_product_attribute_value')\n};\n\nvar HyprManager = function(context) {\n  var self = this;\n  EE.apply(this, arguments);\n\n  if (!context) {\n    throw new Error('Hypr requires a context to be set');\n  }\n  this.context = context;\n  \n  this.engine = new swig.Swig({\n    cache: this.cache || 'memory',\n    locals: this.context.locals,\n    loader: this.loader || swig.loaders.memory(context.templates, '/')\n  });\n\n  Object.keys(filters).forEach(function(name) {\n    self.engine.setFilter(name, filters[name](self));\n  });\n\n};\ninherits(HyprManager, EE);\n\nHyprManager.prototype.evaluate = function(tptText, obj) {\n  return this.engine.render(tptText, { locals: obj });    \n};\n\nHyprManager.prototype.createLoader = function(name) {\n  return swig.loaders[name].apply(swig.loaders, [].slice.call(arguments, 1));\n}\n\n\nmodule.exports = HyprManager;\n},{\"./filters/add_url_param\":7,\"./filters/currency\":8,\"./filters/divisibleby\":9,\"./filters/findwhere\":10,\"./filters/get_product_attribute\":11,\"./filters/get_product_attribute_value\":12,\"./filters/prop\":13,\"./filters/slugify\":14,\"./filters/string_format\":15,\"./filters/truncatewords\":16,\"events\":4,\"inherits\":19,\"swig\":20}],19:[function(require,module,exports){\nif (typeof Object.create === 'function') {\n  // implementation from standard node.js 'util' module\n  module.exports = function inherits(ctor, superCtor) {\n    ctor.super_ = superCtor\n    ctor.prototype = Object.create(superCtor.prototype, {\n      constructor: {\n        value: ctor,\n        enumerable: false,\n        writable: true,\n        configurable: true\n      }\n    });\n  };\n} else {\n  // old school shim for old browsers\n  module.exports = function inherits(ctor, superCtor) {\n    ctor.super_ = superCtor\n    var TempCtor = function () {}\n    TempCtor.prototype = superCtor.prototype\n    ctor.prototype = new TempCtor()\n    ctor.prototype.constructor = ctor\n  }\n}\n\n},{}],20:[function(require,module,exports){\nmodule.exports = require('./lib/swig');\n\n},{\"./lib/swig\":28}],21:[function(require,module,exports){\nvar utils = require('./utils');\n\nvar _months = {\n    full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],\n    abbr: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],\n    ap: ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']\n  },\n  _days = {\n    full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],\n    abbr: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],\n    alt: {'-1': 'Yesterday', 0: 'Today', 1: 'Tomorrow'}\n  };\n\n/*\nDateZ is licensed under the MIT License:\nCopyright (c) 2011 Tomo Universalis (http://tomouniversalis.com)\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n*/\nexports.tzOffset = 0;\nexports.DateZ = function (value) {\n    var members = {\n        'default': ['getUTCDate', 'getUTCDay', 'getUTCFullYear', 'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth', 'getUTCSeconds', 'toISOString', 'toGMTString', 'toUTCString', 'valueOf', 'getTime'],\n        z: ['getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds', 'getMinutes', 'getMonth', 'getSeconds', 'getYear', 'toDateString', 'toLocaleDateString', 'toLocaleTimeString']\n    },\n      d = this,\n      numericValue = value instanceof Date ? Number(value) / 1000 : Number(value);\n\n  d.date = d.dateZ = (arguments.length > 1) ? new Date(Date.UTC.apply(Date, arguments) + ((new Date()).getTimezoneOffset() * 60000)) : (arguments.length === 1) ? new Date(isNaN(numericValue) ? value : numericValue * 1000) : new Date();\n\n  d.timezoneOffset = d.dateZ.getTimezoneOffset();\n\n  utils.each(members.z, function (name) {\n    d[name] = function () {\n      return d.dateZ[name]();\n    };\n  });\n  utils.each(members['default'], function (name) {\n    d[name] = function () {\n      return d.date[name]();\n    };\n  });\n\n  this.setTimezoneOffset(exports.tzOffset);\n};\nexports.DateZ.prototype = {\n  getTimezoneOffset: function () {\n    return this.timezoneOffset;\n  },\n  setTimezoneOffset: function (offset) {\n    this.timezoneOffset = offset;\n    this.dateZ = new Date(this.date.getTime() + this.date.getTimezoneOffset() * 60000 - this.timezoneOffset * 60000);\n    return this;\n  }\n};\n\n\n\n/// a    'a.m.' or 'p.m.' (Note that this is slightly different than PHP's output, because this includes periods to match Associated Press style.)\nexports.a = function (input) {\n  return input.getHours() < 12 ? 'a.m.' : 'p.m.';\n};\n\n/// A    'AM' or 'PM'.\nexports.A = function (input) {\n  return input.getHours() < 12 ? 'AM' : 'PM';\n};\n\n/// b    'jan'          MMM *)  Month, textual, 3 letters, lowercase.\nexports.b = function(input) {\n  return exports.M(input).toLowerCase();\n};\n\n/// B Not implemented in server hypr.\nexports.B = function (input) {\n  var hours = input.getUTCHours(), beats;\n  hours = (hours === 23) ? 0 : hours + 1;\n  beats = Math.abs(((((hours * 60) + input.getUTCMinutes()) * 60) + input.getUTCSeconds()) / 86.4).toFixed(0);\n  return ('000'.concat(beats).slice(beats.length));\n};\n\n/// c ISO 8601 format, for example: 2008-01-02T10:30:00.000123+02:00,\nexports.c = function (input) {\n  return input.toISOString();\n};\n\n/// d    '01' to'31' Day of the month, 2 digits with leading zeros.\nexports.d = function (input) {\n  return (input.getDate() < 10 ? '0' : '') + input.getDate();\n};\n\n/// D    'Fri' Day of the week, textual, 3 letters.\nexports.D = function (input) {\n  return _days.abbr[input.getDay()];\n};\n\n////\n// exports.e not implemented, timezone name cannot be determined in JS\n\n// E   Alternative month name, e.g. 'listopada' instead of 'Listopad' in Polish\nexports.E = exports.F; // this will have to change with internationalization\n\n// f    '1','1:30' Time, in 12-hour hours and minutes, with minutes left off if they're zero. Proprietary extension.\nexports.f = function(input) {\n    var minutes = exports.i(input),\n        hours = exports.g(input);\n    if (minutes === \"00\") return hours;\n    return hours + ':' + minutes;\n};\n\n/// F    'January' Month, textual, long\nexports.F = function (input) {\n  return _months.full[input.getMonth()];\n};\n\n/// g    '1' to '12' Hour, 12-hour format without leading zeros.\nexports.g = function (input) {\n  var h = input.getHours();\n  return h === 0 ? 12 : (h > 12 ? h - 12 : h);\n};\n\n/// G    '0' to '23' Hour, 24-hour format without leading zeros.\nexports.G = function (input) {\n  return input.getHours();\n};\n\n/// h    '01' to '12' Hour, 12-hour format.\nexports.h = function (input) {\n  var h = input.getHours();\n  return ((h < 10 || (12 < h && 22 > h)) ? '0' : '') + ((h < 12) ? h : h - 12);\n};\n\n/// H    '00' to '23' Hour, 24-hour format.\nexports.H = function (input) {\n  var h = input.getHours();\n  return (h < 10 ? '0' : '') + h;\n};\n\n/// i    '00' to '59'   mm      Minutes.\nexports.i = function (input) {\n  var m = input.getMinutes();\n  return (m < 10 ? '0' : '') + m;\n};\n\nfunction standardTimezoneOffset(input) {\n  var jan = new Date(input.getFullYear(), 0, 1);\n  var jul = new Date(input.getFullYear(), 6, 1);\n  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());\n}\n/// I If daylight savings time is implemented or not. probably will fail because server-side only :(\nexports.I = function(input) {\n  return (input.date.getTimezoneOffset() < standardTimezoneOffset(input)).toString();\n};\n\n/// j    '1' to '31' Day of the month without leading zeros.\nexports.j = function (input) {\n  return input.getDate();\n};\n\n/// l    'Friday'  day of the week, textual, long.\nexports.l = function (input) {\n  return _days.full[input.getDay()];\n};\n\n// L     'true'    leap year, true or false\nexports.L = function (input) {\n  return new Date(input.getFullYear(), 1, 29).getDate() === 29;\n};\n\n/// m    '01' to '12' Month, 2 digits with leading zeros.\nexports.m = function (input) {\n  return (input.getMonth() < 9 ? '0' : '') + (input.getMonth() + 1);\n};\n\n/// M    'Jan' Month, textual, 3 letters.\nexports.M = function (input) {\n  return _months.abbr[input.getMonth()];\n};\n\n/// n    '1' to '12'    M (%M)  Month without leading zeros.\nexports.n = function (input) {\n  return input.getMonth() + 1;\n};\n\n/// N  'Jan.', 'Feb.',\n///    'March', 'May'   MMM *)  Month abbreviation in Associated Press style. Proprietary extension.\nexports.N = function (input) {\n  return _months.ap[input.getMonth()];\n};\n\n/// o  '1999' ISO-8601 week-numbering year, corresponding to the ISO-8601 week number (W)\nexports.o = function (input) {\n  var target = new Date(input.valueOf());\n  target.setDate(target.getDate() - ((input.getDay() + 6) % 7) + 3);\n  return target.getFullYear();\n};\n\n/// O    '+0200'        zzz     Difference to Greenwich time in hours.\n///                         *** this will return '+02:00' - note an extra colon in the middle\nexports.O = function (input) {\n    var tz = input.date.getTimezoneOffset();\n    var absTz = Math.abs(tz);\n    var hours = Math.floor(absTz / 60);\n    var minutes = absTz % 60;\n  return (tz < 0 ? '+' : '-') + (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;\n};\n\n\n/// P  '1 a.m.',\n///    '1:30 p.m.',\n///    'midnight',\n///    'noon',\n///    '12:30 p.m.'      ?      Time, in 12-hour hours, minutes and 'a.m.'/'p.m.', with minutes left off if they're zero and the special-case strings 'midnight' and 'noon' if appropriate. Proprietary extension.\nvar midnightOrNoon = {\n  '1200': 'noon',\n  '0000': 'midnight'\n};\nexports.P = function(input) {\n  return midnightOrNoon[exports.H(input) + exports.i(input)] || exports.f(input) + ' ' + exports.a(input);\n};\n\n/// r  'Thu, 21 Dec 2000 16:01:07 +0200' ISO-8601.\nexports.r = function (input) {\n  return input.toUTCString();\n};\n\n/// s    '00' to '59'   ss      Seconds, 2 digits with leading zeros.\nexports.s = function (input) {\n  var s = input.getSeconds();\n  return (s < 10 ? '0' : '') + s;\n};\n\n/// S    'st', 'nd',\n///      'rd' or 'th'    ?      English ordinal suffix for day of the month, 2 characters.\nexports.S = function (input) {\n  var d = input.getDate();\n  return (d % 10 === 1 && d !== 11 ? 'st' : (d % 10 === 2 && d !== 12 ? 'nd' : (d % 10 === 3 && d !== 13 ? 'rd' : 'th')));\n};\n\n/// t    28 to 31 Number of days in the given month.\nexports.t = function (input) {\n  return 32 - (new Date(input.getFullYear(), input.getMonth(), 32).getDate());\n};\n\n///\n// exports.T not implemented\n// because timezone name is impossible to determine\n\n///\n// exports.u not implemented\n// because microsecond resolution is unavailable\n\n\nexports.U = function (input) {\n  return Math.floor(input.getTime() / 1000);\n};\n\n/// w  '0' (Sunday) to\n///    '6' (Saturday)   ddd *)  Day of the week, digits without leading zeros.\nexports.w = function (input) {\n  return input.getDay();\n};\n\n/// W    1, 53 ISO-8601 week number of year, with weeks starting on Monday.\nexports.W = function (input) {\n  var target = new Date(input.valueOf()),\n    dayNr = (input.getDay() + 6) % 7,\n    fThurs;\n\n  target.setDate(target.getDate() - dayNr + 3);\n  fThurs = target.valueOf();\n  target.setMonth(0, 1);\n  if (target.getDay() !== 4) {\n    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);\n  }\n\n  return 1 + Math.ceil((fThurs - target) / 604800000);\n};\n\n/// y    '99' Year, 2 digits.\nexports.y = function (input) {\n  return (input.getFullYear().toString()).substr(2);\n};\n\n/// Y    '1999' Year, 4 digits.\nexports.Y = function (input) {\n  return input.getFullYear();\n};\n\n/// z    0 to 365 Day of the year.\nexports.z = function (input, offset, abbr) {\n  var year = input.getFullYear(),\n    e = new exports.DateZ(year, input.getMonth(), input.getDate(), 12, 0, 0),\n    d = new exports.DateZ(year, 0, 1, 12, 0, 0);\n\n  e.setTimezoneOffset(offset, abbr);\n  d.setTimezoneOffset(offset, abbr);\n  return Math.round((e - d) / 86400000);\n};\n\n/// Z -43200 to 43200 Time zone offset in seconds. The offset for timezones west of UTC is always negative, and for those east of UTC is always positive.\nexports.Z = function (input) {\n  return input.getTimezoneOffset() * 60;\n};\n\n},{\"./utils\":45}],22:[function(require,module,exports){\nvar utils = require('./utils'),\n  dateFormatter = require('./dateformatter');\n\n/**\n * Helper method to recursively run a filter across an object/array and apply it to all of the object/array's values.\n * @param  {*} input\n * @return {*}\n * @private\n */\nfunction iterateFilter(input) {\n  var self = this,\n    out = {};\n\n  if (utils.isArray(input)) {\n    return utils.map(input, function (value) {\n      return self.apply(null, arguments);\n    });\n  }\n\n  if (input !== null && input !== undefined && typeof input === 'object') {\n    utils.each(input, function (value, key) {\n      out[key] = self.apply(null, arguments);\n    });\n    return out;\n  }\n\n  return;\n}\n\n/**\n * Backslash-escape characters that need to be escaped.\n *\n * @example\n * {{ \"\\\"quoted string\\\"\"|addslashes }}\n * // => \\\"quoted string\\\"\n *\n * @param  {*}  input\n * @return {*}        Backslash-escaped string.\n */\nexports.addslashes = function (input) {\n  var out = iterateFilter.apply(exports.addslashes, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n\n  return input.replace(/\\\\/g, '\\\\\\\\').replace(/\\'/g, \"\\\\'\").replace(/\\\"/g, '\\\\\"');\n};\n\n/**\n * Upper-case the first letter of the input and lower-case the rest.\n *\n * @example\n * {{ \"i like Burritos\"|capitalize }}\n * // => I like burritos\n *\n * @param  {*} input  If given an array or object, each string member will be run through the filter individually.\n * @return {*}        Returns the same type as the input.\n */\nexports.capitalize = function (input) {\n  var out = iterateFilter.apply(exports.capitalize, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n\n  return input.toString().charAt(0).toUpperCase() + input.toString().substr(1).toLowerCase();\n};\n\n/**\n * Format a date or Date-compatible string.\n *\n * @example\n * // now = new Date();\n * {{ now|date('Y-m-d') }}\n * // => 2013-08-14\n * @example\n * // now = new Date();\n * {{ now|date('jS \\o\\f F') }}\n * // => 4th of July\n *\n * @param  {?(string|date)}   input\n * @param  {string}           format  PHP-style date format compatible string. Escape characters with <code>\\</code> for string literals.\n * @param  {number=}          offset  Timezone offset from GMT in minutes.\n * @param  {string=}          abbr    Timezone abbreviation. Used for output only.\n * @return {string}                   Formatted date string.\n */\nexports.date = function (input, format, offset, abbr) {\n  var l = format.length,\n    date = new dateFormatter.DateZ(input),\n    cur,\n    i = 0,\n    out = '';\n\n  if (offset) {\n    date.setTimezoneOffset(offset, abbr);\n  }\n\n  for (i; i < l; i += 1) {\n    cur = format.charAt(i);\n    if (cur === '\\\\') {\n      i += 1;\n      out += (i < l) ? format.charAt(i) : cur;\n    } else if (dateFormatter.hasOwnProperty(cur)) {\n      out += dateFormatter[cur](date, offset, abbr);\n    } else {\n      out += cur;\n    }\n  }\n  return out;\n};\n\n/**\n * If the input is `undefined`, `null`, or `false`, a default return value can be specified.\n *\n * @example\n * {{ null_value|default('Tacos') }}\n * // => Tacos\n *\n * @example\n * {{ \"Burritos\"|default(\"Tacos\") }}\n * // => Burritos\n *\n * @param  {*}  input\n * @param  {*}  def     Value to return if `input` is `undefined`, `null`, or `false`.\n * @return {*}          `input` or `def` value.\n */\nexports[\"default\"] = function (input, def) {\n  return (typeof input !== 'undefined' && (input || typeof input === 'number')) ? input : def;\n};\n\n/**\n * Force escape the output of the variable. Optionally use `e` as a shortcut filter name. This filter will be applied by default if autoescape is turned on.\n *\n * @example\n * {{ \"<blah>\"|escape }}\n * // => &lt;blah&gt;\n *\n * @example\n * {{ \"<blah>\"|e(\"js\") }}\n * // => \\u003Cblah\\u003E\n *\n * @param  {*} input\n * @param  {string} [type='html']   If you pass the string js in as the type, output will be escaped so that it is safe for JavaScript execution.\n * @return {string}         Escaped string.\n */\nexports.escape = function (input, type) {\n  var out = iterateFilter.apply(exports.escape, arguments),\n    inp = input,\n    i = 0,\n    code;\n\n  if (out !== undefined) {\n    return out;\n  }\n\n  if (input === null || input === undefined) {\n    return '';\n  }\n\n  if (typeof input !== 'string') {\n    return input;\n  }\n\n  out = '';\n\n  switch (type) {\n  case 'js':\n    inp = inp.replace(/\\\\/g, '\\\\u005C');\n    for (i; i < inp.length; i += 1) {\n      code = inp.charCodeAt(i);\n      if (code < 32) {\n        code = code.toString(16).toUpperCase();\n        code = (code.length < 2) ? '0' + code : code;\n        out += '\\\\u00' + code;\n      } else {\n        out += inp[i];\n      }\n    }\n    return out.replace(/&/g, '\\\\u0026')\n      .replace(/</g, '\\\\u003C')\n      .replace(/>/g, '\\\\u003E')\n      .replace(/\\'/g, '\\\\u0027')\n      .replace(/\"/g, '\\\\u0022')\n      .replace(/\\=/g, '\\\\u003D')\n      .replace(/-/g, '\\\\u002D')\n      .replace(/;/g, '\\\\u003B');\n\n  default:\n    return inp.replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;')\n      .replace(/</g, '&lt;')\n      .replace(/>/g, '&gt;')\n      .replace(/\"/g, '&quot;')\n      .replace(/'/g, '&#39;');\n  }\n};\nexports.e = exports.escape;\n\n/**\n * Get the first item in an array or character in a string. All other objects will attempt to return the first value available.\n *\n * @example\n * // my_arr = ['a', 'b', 'c']\n * {{ my_arr|first }}\n * // => a\n *\n * @example\n * // my_val = 'Tacos'\n * {{ my_val|first }}\n * // T\n *\n * @param  {*} input\n * @return {*}        The first item of the array or first character of the string input.\n */\nexports.first = function (input) {\n  if (typeof input === 'object' && !utils.isArray(input)) {\n    var keys = utils.keys(input);\n    return input[keys[0]];\n  }\n\n  if (typeof input === 'string') {\n    return input.substr(0, 1);\n  }\n\n  return input[0];\n};\n\n/**\n * Group an array of objects by a common key. If an array is not provided, the input value will be returned untouched.\n *\n * @example\n * // people = [{ age: 23, name: 'Paul' }, { age: 26, name: 'Jane' }, { age: 23, name: 'Jim' }];\n * {% for agegroup in people|groupBy('age') %}\n *   <h2>{{ loop.key }}</h2>\n *   <ul>\n *     {% for person in agegroup %}\n *     <li>{{ person.name }}</li>\n *     {% endfor %}\n *   </ul>\n * {% endfor %}\n *\n * @param  {*}      input Input object.\n * @param  {string} key   Key to group by.\n * @return {object}       Grouped arrays by given key.\n */\nexports.groupBy = function (input, key) {\n  if (!utils.isArray(input)) {\n    return input;\n  }\n\n  var out = {};\n\n  utils.each(input, function (value) {\n    if (!value.hasOwnProperty(key)) {\n      return;\n    }\n\n    var keyname = value[key],\n      newVal = utils.extend({}, value);\n    delete newVal[key];\n\n    if (!out[keyname]) {\n      out[keyname] = [];\n    }\n\n    out[keyname].push(newVal);\n  });\n\n  return out;\n};\n\n/**\n * Join the input with a string.\n *\n * @example\n * // my_array = ['foo', 'bar', 'baz']\n * {{ my_array|join(', ') }}\n * // => foo, bar, baz\n *\n * @example\n * // my_key_object = { a: 'foo', b: 'bar', c: 'baz' }\n * {{ my_key_object|join(' and ') }}\n * // => foo and bar and baz\n *\n * @param  {*}  input\n * @param  {string} glue    String value to join items together.\n * @return {string}\n */\nexports.join = function (input, glue) {\n  if (utils.isArray(input)) {\n    return input.join(glue);\n  }\n\n  if (typeof input === 'object') {\n    var out = [];\n    utils.each(input, function (value) {\n      out.push(value);\n    });\n    return out.join(glue);\n  }\n  return input;\n};\n\n/**\n * Return a string representation of an JavaScript object.\n *\n * Backwards compatible with swig@0.x.x using `json_encode`.\n *\n * @example\n * // val = { a: 'b' }\n * {{ val|json }}\n * // => {\"a\":\"b\"}\n *\n * @example\n * // val = { a: 'b' }\n * {{ val|json(4) }}\n * // => {\n * //        \"a\": \"b\"\n * //    }\n *\n * @param  {*}    input\n * @param  {number}  [indent]  Number of spaces to indent for pretty-formatting.\n * @return {string}           A valid JSON string.\n */\nexports.json = function (input, indent) {\n  return JSON.stringify(input, null, indent || 0);\n};\nexports.json_encode = exports.json;\n\n/**\n * Get the last item in an array or character in a string. All other objects will attempt to return the last value available.\n *\n * @example\n * // my_arr = ['a', 'b', 'c']\n * {{ my_arr|last }}\n * // => c\n *\n * @example\n * // my_val = 'Tacos'\n * {{ my_val|last }}\n * // s\n *\n * @param  {*} input\n * @return {*}          The last item of the array or last character of the string.input.\n */\nexports.last = function (input) {\n  if (typeof input === 'object' && !utils.isArray(input)) {\n    var keys = utils.keys(input);\n    return input[keys[keys.length - 1]];\n  }\n\n  if (typeof input === 'string') {\n    return input.charAt(input.length - 1);\n  }\n\n  return input[input.length - 1];\n};\n\n/**\n * Return the input in all lowercase letters.\n *\n * @example\n * {{ \"FOOBAR\"|lower }}\n * // => foobar\n *\n * @example\n * // myObj = { a: 'FOO', b: 'BAR' }\n * {{ myObj|lower|join('') }}\n * // => foobar\n *\n * @param  {*}  input\n * @return {*}          Returns the same type as the input.\n */\nexports.lower = function (input) {\n  var out = iterateFilter.apply(exports.lower, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n\n  return input.toString().toLowerCase();\n};\n\n/**\n * Deprecated in favor of <a href=\"#safe\">safe</a>.\n */\nexports.raw = function (input) {\n  return exports.safe(input);\n};\nexports.raw.safe = true;\n\n/**\n * Returns a new string with the matched search pattern replaced by the given replacement string. Uses JavaScript's built-in String.replace() method.\n *\n * @example\n * // my_var = 'foobar';\n * {{ my_var|replace('o', 'e', 'g') }}\n * // => feebar\n *\n * @example\n * // my_var = \"farfegnugen\";\n * {{ my_var|replace('^f', 'p') }}\n * // => parfegnugen\n *\n * @example\n * // my_var = 'a1b2c3';\n * {{ my_var|replace('\\w', '0', 'g') }}\n * // => 010203\n *\n * @param  {string} input\n * @param  {string} search      String or pattern to replace from the input.\n * @param  {string} replacement String to replace matched pattern.\n * @param  {string} [flags]      Regular Expression flags. 'g': global match, 'i': ignore case, 'm': match over multiple lines\n * @return {string}             Replaced string.\n */\nexports.replace = function (input, search, replacement, flags) {\n  var r = new RegExp(search, flags);\n  return input.replace(r, replacement);\n};\n\n/**\n * Reverse sort the input. This is an alias for <code data-language=\"swig\">{{ input|sort(true) }}</code>.\n *\n * @example\n * // val = [1, 2, 3];\n * {{ val|reverse }}\n * // => 3,2,1\n *\n * @param  {array}  input\n * @return {array}        Reversed array. The original input object is returned if it was not an array.\n */\nexports.reverse = function (input) {\n  return exports.sort(input, true);\n};\n\n/**\n * Forces the input to not be auto-escaped. Use this only on content that you know is safe to be rendered on your page.\n *\n * @example\n * // my_var = \"<p>Stuff</p>\";\n * {{ my_var|safe }}\n * // => <p>Stuff</p>\n *\n * @param  {*}  input\n * @return {*}          The input exactly how it was given, regardless of autoescaping status.\n */\nexports.safe = function (input) {\n  // This is a magic filter. Its logic is hard-coded into Swig's parser.\n  return input;\n};\nexports.safe.safe = true;\n\n/**\n * Sort the input in an ascending direction.\n * If given an object, will return the keys as a sorted array.\n * If given a string, each character will be sorted individually.\n *\n * @example\n * // val = [2, 6, 4];\n * {{ val|sort }}\n * // => 2,4,6\n *\n * @example\n * // val = 'zaq';\n * {{ val|sort }}\n * // => aqz\n *\n * @example\n * // val = { bar: 1, foo: 2 }\n * {{ val|sort(true) }}\n * // => foo,bar\n *\n * @param  {*} input\n * @param {boolean} [reverse=false] Output is given reverse-sorted if true.\n * @return {*}        Sorted array;\n */\nexports.sort = function (input, reverse) {\n  var out;\n  if (utils.isArray(input)) {\n    out = input.sort();\n  } else {\n    switch (typeof input) {\n    case 'object':\n      out = utils.keys(input).sort();\n      break;\n    case 'string':\n      out = input.split('');\n      if (reverse) {\n        return out.reverse().join('');\n      }\n      return out.sort().join('');\n    }\n  }\n\n  if (out && reverse) {\n    return out.reverse();\n  }\n\n  return out || input;\n};\n\n/**\n * Strip HTML tags.\n *\n * @example\n * // stuff = '<p>foobar</p>';\n * {{ stuff|striptags }}\n * // => foobar\n *\n * @param  {*}  input\n * @return {*}        Returns the same object as the input, but with all string values stripped of tags.\n */\nexports.striptags = function (input) {\n  var out = iterateFilter.apply(exports.striptags, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n\n  return input.toString().replace(/(<([^>]+)>)/ig, '');\n};\n\n/**\n * Capitalizes every word given and lower-cases all other letters.\n *\n * @example\n * // my_str = 'this is soMe text';\n * {{ my_str|title }}\n * // => This Is Some Text\n *\n * @example\n * // my_arr = ['hi', 'this', 'is', 'an', 'array'];\n * {{ my_arr|title|join(' ') }}\n * // => Hi This Is An Array\n *\n * @param  {*}  input\n * @return {*}        Returns the same object as the input, but with all words in strings title-cased.\n */\nexports.title = function (input) {\n  var out = iterateFilter.apply(exports.title, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n\n  return input.toString().replace(/\\w\\S*/g, function (str) {\n    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();\n  });\n};\n\n/**\n * Remove all duplicate items from an array.\n *\n * @example\n * // my_arr = [1, 2, 3, 4, 4, 3, 2, 1];\n * {{ my_arr|uniq|join(',') }}\n * // => 1,2,3,4\n *\n * @param  {array}  input\n * @return {array}        Array with unique items. If input was not an array, the original item is returned untouched.\n */\nexports.uniq = function (input) {\n  var result;\n\n  if (!input || !utils.isArray(input)) {\n    return '';\n  }\n\n  result = [];\n  utils.each(input, function (v) {\n    if (result.indexOf(v) === -1) {\n      result.push(v);\n    }\n  });\n  return result;\n};\n\n/**\n * Convert the input to all uppercase letters. If an object or array is provided, all values will be uppercased.\n *\n * @example\n * // my_str = 'tacos';\n * {{ my_str|upper }}\n * // => TACOS\n *\n * @example\n * // my_arr = ['tacos', 'burritos'];\n * {{ my_arr|upper|join(' & ') }}\n * // => TACOS & BURRITOS\n *\n * @param  {*}  input\n * @return {*}        Returns the same type as the input, with all strings upper-cased.\n */\nexports.upper = function (input) {\n  var out = iterateFilter.apply(exports.upper, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n\n  return input.toString().toUpperCase();\n};\n\n/**\n * URL-encode a string. If an object or array is passed, all values will be URL-encoded.\n *\n * @example\n * // my_str = 'param=1&anotherParam=2';\n * {{ my_str|url_encode }}\n * // => param%3D1%26anotherParam%3D2\n *\n * @param  {*} input\n * @return {*}       URL-encoded string.\n */\nexports.url_encode = function (input) {\n  var out = iterateFilter.apply(exports.url_encode, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n  return encodeURIComponent(input);\n};\n\n/**\n * URL-decode a string. If an object or array is passed, all values will be URL-decoded.\n *\n * @example\n * // my_str = 'param%3D1%26anotherParam%3D2';\n * {{ my_str|url_decode }}\n * // => param=1&anotherParam=2\n *\n * @param  {*} input\n * @return {*}       URL-decoded string.\n */\nexports.url_decode = function (input) {\n  var out = iterateFilter.apply(exports.url_decode, arguments);\n  if (out !== undefined) {\n    return out;\n  }\n  return decodeURIComponent(input);\n};\n\n},{\"./dateformatter\":21,\"./utils\":45}],23:[function(require,module,exports){\nvar utils = require('./utils');\n\n/**\n * A lexer token.\n * @typedef {object} LexerToken\n * @property {string} match  The string that was matched.\n * @property {number} type   Lexer type enum.\n * @property {number} length Length of the original string processed.\n */\n\n/**\n * Enum for token types.\n * @readonly\n * @enum {number}\n */\nvar TYPES = {\n    /** Whitespace */\n    WHITESPACE: 0,\n    /** Plain string */\n    STRING: 1,\n    /** Variable filter */\n    FILTER: 2,\n    /** Empty variable filter */\n    FILTEREMPTY: 3,\n    /** Function */\n    FUNCTION: 4,\n    /** Function with no arguments */\n    FUNCTIONEMPTY: 5,\n    /** Open parenthesis */\n    PARENOPEN: 6,\n    /** Close parenthesis */\n    PARENCLOSE: 7,\n    /** Comma */\n    COMMA: 8,\n    /** Variable */\n    VAR: 9,\n    /** Number */\n    NUMBER: 10,\n    /** Math operator */\n    OPERATOR: 11,\n    /** Open square bracket */\n    BRACKETOPEN: 12,\n    /** Close square bracket */\n    BRACKETCLOSE: 13,\n    /** Key on an object using dot-notation */\n    DOTKEY: 14,\n    /** Start of an array */\n    ARRAYOPEN: 15,\n    /** End of an array\n     * Currently unused\n    ARRAYCLOSE: 16, */\n    /** Open curly brace */\n    CURLYOPEN: 17,\n    /** Close curly brace */\n    CURLYCLOSE: 18,\n    /** Colon (:) */\n    COLON: 19,\n    /** JavaScript-valid comparator */\n    COMPARATOR: 20,\n    /** Boolean logic */\n    LOGIC: 21,\n    /** Boolean logic \"not\" */\n    NOT: 22,\n    /** true or false */\n    BOOL: 23,\n    /** Variable assignment */\n    ASSIGNMENT: 24,\n    /** Start of a method */\n    METHODOPEN: 25,\n    /** End of a method\n     * Currently unused\n    METHODEND: 26, */\n    /** Unknown type */\n    UNKNOWN: 100\n  },\n  rules = [\n    {\n      type: TYPES.WHITESPACE,\n      regex: [\n        /^\\s+/\n      ]\n    },\n    {\n      type: TYPES.STRING,\n      regex: [\n        /^\"\"/,\n        /^\".*?[^\\\\]\"/,\n        /^''/,\n        /^'.*?[^\\\\]'/\n      ]\n    },\n    {\n      type: TYPES.FILTER,\n      regex: [\n        /^\\|\\s*(\\w+)\\(/\n      ],\n      idx: 1\n    },\n    {\n      type: TYPES.FILTEREMPTY,\n      regex: [\n        /^\\|\\s*(\\w+)/\n      ],\n      idx: 1\n    },\n    {\n      type: TYPES.FUNCTIONEMPTY,\n      regex: [\n        /^\\s*(\\w+)\\(\\)/\n      ],\n      idx: 1\n    },\n    {\n      type: TYPES.FUNCTION,\n      regex: [\n        /^\\s*(\\w+)\\(/\n      ],\n      idx: 1\n    },\n    {\n      type: TYPES.PARENOPEN,\n      regex: [\n        /^\\(/\n      ]\n    },\n    {\n      type: TYPES.PARENCLOSE,\n      regex: [\n        /^\\)/\n      ]\n    },\n    {\n      type: TYPES.COMMA,\n      regex: [\n        /^,/\n      ]\n    },\n    {\n      type: TYPES.LOGIC,\n      regex: [\n        /^(&&|\\|\\|)\\s*/,\n        /^(and|or)\\s+/\n      ],\n      idx: 1,\n      replace: {\n        'and': '&&',\n        'or': '||'\n      }\n    },\n    {\n      type: TYPES.COMPARATOR,\n      regex: [\n        /^(===|==|\\!==|\\!=|<=|<|>=|>|in\\s|gte\\s|gt\\s|lte\\s|lt\\s)\\s*/\n      ],\n      idx: 1,\n      replace: {\n        'gte': '>=',\n        'gt': '>',\n        'lte': '<=',\n        'lt': '<'\n      }\n    },\n    {\n      type: TYPES.ASSIGNMENT,\n      regex: [\n        /^(=|\\+=|-=|\\*=|\\/=)/\n      ]\n    },\n    {\n      type: TYPES.NOT,\n      regex: [\n        /^\\!\\s*/,\n        /^not\\s+/\n      ],\n      replace: {\n        'not': '!'\n      }\n    },\n    {\n      type: TYPES.BOOL,\n      regex: [\n        /^(true|false)\\s+/,\n        /^(true|false)$/\n      ],\n      idx: 1\n    },\n    {\n      type: TYPES.VAR,\n      regex: [\n        /^[a-zA-Z_$]\\w*((\\.\\$?\\w*)+)?/,\n        /^[a-zA-Z_$]\\w*/\n      ]\n    },\n    {\n      type: TYPES.BRACKETOPEN,\n      regex: [\n        /^\\[/\n      ]\n    },\n    {\n      type: TYPES.BRACKETCLOSE,\n      regex: [\n        /^\\]/\n      ]\n    },\n    {\n      type: TYPES.CURLYOPEN,\n      regex: [\n        /^\\{/\n      ]\n    },\n    {\n      type: TYPES.COLON,\n      regex: [\n        /^\\:/\n      ]\n    },\n    {\n      type: TYPES.CURLYCLOSE,\n      regex: [\n        /^\\}/\n      ]\n    },\n    {\n      type: TYPES.DOTKEY,\n      regex: [\n        /^\\.(\\w+)/\n      ],\n      idx: 1\n    },\n    {\n      type: TYPES.NUMBER,\n      regex: [\n        /^[+\\-]?\\d+(\\.\\d+)?/\n      ]\n    },\n    {\n      type: TYPES.OPERATOR,\n      regex: [\n        /^(\\+|\\-|\\/|\\*|%)/\n      ]\n    }\n  ];\n\nexports.types = TYPES;\n\n/**\n * Return the token type object for a single chunk of a string.\n * @param  {string} str String chunk.\n * @return {LexerToken}     Defined type, potentially stripped or replaced with more suitable content.\n * @private\n */\nfunction reader(str) {\n  var matched;\n\n  utils.some(rules, function (rule) {\n    return utils.some(rule.regex, function (regex) {\n      var match = str.match(regex),\n        normalized;\n\n      if (!match) {\n        return;\n      }\n\n      normalized = match[rule.idx || 0].replace(/\\s*$/, '');\n      normalized = (rule.hasOwnProperty('replace') && rule.replace.hasOwnProperty(normalized)) ? rule.replace[normalized] : normalized;\n\n      matched = {\n        match: normalized,\n        type: rule.type,\n        length: match[0].length\n      };\n      return true;\n    });\n  });\n\n  if (!matched) {\n    matched = {\n      match: str,\n      type: TYPES.UNKNOWN,\n      length: str.length\n    };\n  }\n\n  return matched;\n}\n\n/**\n * Read a string and break it into separate token types.\n * @param  {string} str\n * @return {Array.LexerToken}     Array of defined types, potentially stripped or replaced with more suitable content.\n * @private\n */\nexports.read = function (str) {\n  var offset = 0,\n    tokens = [],\n    substr,\n    match;\n  while (offset < str.length) {\n    substr = str.substring(offset);\n    match = reader(substr);\n    offset += match.length;\n    tokens.push(match);\n  }\n  return tokens;\n};\n\n},{\"./utils\":45}],24:[function(require,module,exports){\n(function (process){\nvar fs = require('fs'),\n  path = require('path');\n\n/**\n * Loads templates from the file system.\n * @alias swig.loaders.fs\n * @example\n * swig.setDefaults({ loader: swig.loaders.fs() });\n * @example\n * // Load Templates from a specific directory (does not require using relative paths in your templates)\n * swig.setDefaults({ loader: swig.loaders.fs(__dirname + '/templates' )});\n * @param {string}   [basepath='']     Path to the templates as string. Assigning this value allows you to use semi-absolute paths to templates instead of relative paths.\n * @param {string}   [encoding='utf8']   Template encoding\n */\nmodule.exports = function (basepath, encoding) {\n  var ret = {};\n\n  encoding = encoding || 'utf8';\n  basepath = (basepath) ? path.normalize(basepath) : null;\n\n  /**\n   * Resolves <var>to</var> to an absolute path or unique identifier. This is used for building correct, normalized, and absolute paths to a given template.\n   * @alias resolve\n   * @param  {string} to        Non-absolute identifier or pathname to a file.\n   * @param  {string} [from]    If given, should attempt to find the <var>to</var> path in relation to this given, known path.\n   * @return {string}\n   */\n  ret.resolve = function (to, from) {\n    if (basepath) {\n      from = basepath;\n    } else {\n      from = (from) ? path.dirname(from) : process.cwd();\n    }\n    return path.resolve(from, to);\n  };\n\n  /**\n   * Loads a single template. Given a unique <var>identifier</var> found by the <var>resolve</var> method this should return the given template.\n   * @alias load\n   * @param  {string}   identifier  Unique identifier of a template (possibly an absolute path).\n   * @param  {function} [cb]        Asynchronous callback function. If not provided, this method should run synchronously.\n   * @return {string}               Template source string.\n   */\n  ret.load = function (identifier, cb) {\n    if (!fs || (cb && !fs.readFile) || !fs.readFileSync) {\n      throw new Error('Unable to find file ' + identifier + ' because there is no filesystem to read from.');\n    }\n\n    identifier = ret.resolve(identifier);\n\n    if (cb) {\n      fs.readFile(identifier, encoding, cb);\n      return;\n    }\n    return fs.readFileSync(identifier, encoding);\n  };\n\n  return ret;\n};\n\n}).call(this,require('_process'))\n},{\"_process\":6,\"fs\":3,\"path\":5}],25:[function(require,module,exports){\n/**\n * @namespace TemplateLoader\n * @description Swig is able to accept custom template loaders written by you, so that your templates can come from your favorite storage medium without needing to be part of the core library.\n * A template loader consists of two methods: <var>resolve</var> and <var>load</var>. Each method is used internally by Swig to find and load the source of the template before attempting to parse and compile it.\n * @example\n * // A theoretical memcached loader\n * var path = require('path'),\n *   Memcached = require('memcached');\n * function memcachedLoader(locations, options) {\n *   var memcached = new Memcached(locations, options);\n *   return {\n *     resolve: function (to, from) {\n *       return path.resolve(from, to);\n *     },\n *     load: function (identifier, cb) {\n *       memcached.get(identifier, function (err, data) {\n *         // if (!data) { load from filesystem; }\n *         cb(err, data);\n *       });\n *     }\n *   };\n * };\n * // Tell swig about the loader:\n * swig.setDefaults({ loader: memcachedLoader(['192.168.0.2']) });\n */\n\n/**\n * @function\n * @name resolve\n * @memberof TemplateLoader\n * @description\n * Resolves <var>to</var> to an absolute path or unique identifier. This is used for building correct, normalized, and absolute paths to a given template.\n * @param  {string} to        Non-absolute identifier or pathname to a file.\n * @param  {string} [from]    If given, should attempt to find the <var>to</var> path in relation to this given, known path.\n * @return {string}\n */\n\n/**\n * @function\n * @name load\n * @memberof TemplateLoader\n * @description\n * Loads a single template. Given a unique <var>identifier</var> found by the <var>resolve</var> method this should return the given template.\n * @param  {string}   identifier  Unique identifier of a template (possibly an absolute path).\n * @param  {function} [cb]        Asynchronous callback function. If not provided, this method should run synchronously.\n * @return {string}               Template source string.\n */\n\n/**\n * @private\n */\nexports.fs = require('./filesystem');\nexports.memory = require('./memory');\n\n},{\"./filesystem\":24,\"./memory\":26}],26:[function(require,module,exports){\nvar path = require('path'),\n  utils = require('../utils');\n\n/**\n * Loads templates from a provided object mapping.\n * @alias swig.loaders.memory\n * @example\n * var templates = {\n *   \"layout\": \"{% block content %}{% endblock %}\",\n *   \"home.html\": \"{% extends 'layout.html' %}{% block content %}...{% endblock %}\"\n * };\n * swig.setDefaults({ loader: swig.loaders.memory(templates) });\n *\n * @param {object} mapping Hash object with template paths as keys and template sources as values.\n * @param {string} [basepath] Path to the templates as string. Assigning this value allows you to use semi-absolute paths to templates instead of relative paths.\n */\nmodule.exports = function (mapping, basepath) {\n  var ret = {};\n\n  basepath = (basepath) ? path.normalize(basepath) : null;\n\n  /**\n   * Resolves <var>to</var> to an absolute path or unique identifier. This is used for building correct, normalized, and absolute paths to a given template.\n   * @alias resolve\n   * @param  {string} to        Non-absolute identifier or pathname to a file.\n   * @param  {string} [from]    If given, should attempt to find the <var>to</var> path in relation to this given, known path.\n   * @return {string}\n   */\n  ret.resolve = function (to, from) {\n    if (basepath) {\n      from = basepath;\n    } else {\n      from = (from) ? path.dirname(from) : '/';\n    }\n    return path.resolve(from, to);\n  };\n\n  /**\n   * Loads a single template. Given a unique <var>identifier</var> found by the <var>resolve</var> method this should return the given template.\n   * @alias load\n   * @param  {string}   identifier  Unique identifier of a template (possibly an absolute path).\n   * @param  {function} [cb]        Asynchronous callback function. If not provided, this method should run synchronously.\n   * @return {string}               Template source string.\n   */\n  ret.load = function (pathname, cb) {\n    var src, paths;\n\n    paths = [pathname, pathname.replace(/^(\\/|\\\\)/, '')];\n\n    src = mapping[paths[0]] || mapping[paths[1]];\n    if (!src) {\n      utils.throwError('Unable to find template \"' + pathname + '\".');\n    }\n\n    if (cb) {\n      cb(null, src);\n      return;\n    }\n    return src;\n  };\n\n  return ret;\n};\n\n},{\"../utils\":45,\"path\":5}],27:[function(require,module,exports){\nvar utils = require('./utils'),\n  lexer = require('./lexer');\n\nvar _t = lexer.types,\n  _reserved = ['break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while'];\n\n\n/**\n * Filters are simply functions that perform transformations on their first input argument.\n * Filters are run at render time, so they may not directly modify the compiled template structure in any way.\n * All of Swig's built-in filters are written in this same way. For more examples, reference the `filters.js` file in Swig's source.\n *\n * To disable auto-escaping on a custom filter, simply add a property to the filter method `safe = true;` and the output from this will not be escaped, no matter what the global settings are for Swig.\n *\n * @typedef {function} Filter\n *\n * @example\n * // This filter will return 'bazbop' if the idx on the input is not 'foobar'\n * swig.setFilter('foobar', function (input, idx) {\n *   return input[idx] === 'foobar' ? input[idx] : 'bazbop';\n * });\n * // myvar = ['foo', 'bar', 'baz', 'bop'];\n * // => {{ myvar|foobar(3) }}\n * // Since myvar[3] !== 'foobar', we render:\n * // => bazbop\n *\n * @example\n * // This filter will disable auto-escaping on its output:\n * function bazbop (input) { return input; }\n * bazbop.safe = true;\n * swig.setFilter('bazbop', bazbop);\n * // => {{ \"<p>\"|bazbop }}\n * // => <p>\n *\n * @param {*} input Input argument, automatically sent from Swig's built-in parser.\n * @param {...*} [args] All other arguments are defined by the Filter author.\n * @return {*}\n */\n\n/*!\n * Makes a string safe for a regular expression.\n * @param  {string} str\n * @return {string}\n * @private\n */\nfunction escapeRegExp(str) {\n  return str.replace(/[\\-\\/\\\\\\^$*+?.()|\\[\\]{}]/g, '\\\\$&');\n}\n\n/**\n * Parse strings of variables and tags into tokens for future compilation.\n * @class\n * @param {array}   tokens     Pre-split tokens read by the Lexer.\n * @param {object}  filters    Keyed object of filters that may be applied to variables.\n * @param {boolean} autoescape Whether or not this should be autoescaped.\n * @param {number}  line       Beginning line number for the first token.\n * @param {string}  [filename] Name of the file being parsed.\n * @private\n */\nfunction TokenParser(tokens, filters, autoescape, line, filename) {\n  this.out = [];\n  this.state = [];\n  this.filterApplyIdx = [];\n  this._parsers = {};\n  this.line = line;\n  this.filename = filename;\n  this.filters = filters;\n  this.escape = autoescape;\n\n  this.parse = function () {\n    var self = this;\n\n    if (self._parsers.start) {\n      self._parsers.start.call(self);\n    }\n    utils.each(tokens, function (token, i) {\n      var prevToken = tokens[i - 1];\n      self.isLast = (i === tokens.length - 1);\n      if (prevToken) {\n        while (prevToken.type === _t.WHITESPACE) {\n          i -= 1;\n          prevToken = tokens[i - 1];\n        }\n      }\n      self.prevToken = prevToken;\n      self.parseToken(token);\n    });\n    if (self._parsers.end) {\n      self._parsers.end.call(self);\n    }\n\n    if (self.escape) {\n      self.filterApplyIdx = [0];\n      if (typeof self.escape === 'string') {\n        self.parseToken({ type: _t.FILTER, match: 'e' });\n        self.parseToken({ type: _t.COMMA, match: ',' });\n        self.parseToken({ type: _t.STRING, match: String(autoescape) });\n        self.parseToken({ type: _t.PARENCLOSE, match: ')'});\n      } else {\n        self.parseToken({ type: _t.FILTEREMPTY, match: 'e' });\n      }\n    }\n\n    return self.out;\n  };\n}\n\nTokenParser.prototype = {\n  /**\n   * Set a custom method to be called when a token type is found.\n   *\n   * @example\n   * parser.on(types.STRING, function (token) {\n   *   this.out.push(token.match);\n   * });\n   * @example\n   * parser.on('start', function () {\n   *   this.out.push('something at the beginning of your args')\n   * });\n   * parser.on('end', function () {\n   *   this.out.push('something at the end of your args');\n   * });\n   *\n   * @param  {number}   type Token type ID. Found in the Lexer.\n   * @param  {Function} fn   Callback function. Return true to continue executing the default parsing function.\n   * @return {undefined}\n   */\n  on: function (type, fn) {\n    this._parsers[type] = fn;\n  },\n\n  /**\n   * Parse a single token.\n   * @param  {{match: string, type: number, line: number}} token Lexer token object.\n   * @return {undefined}\n   * @private\n   */\n  parseToken: function (token) {\n    var self = this,\n      fn = self._parsers[token.type] || self._parsers['*'],\n      match = token.match,\n      prevToken = self.prevToken,\n      prevTokenType = prevToken ? prevToken.type : null,\n      lastState = (self.state.length) ? self.state[self.state.length - 1] : null,\n      temp;\n\n    if (fn && typeof fn === 'function') {\n      if (!fn.call(this, token)) {\n        return;\n      }\n    }\n\n    if (lastState && prevToken &&\n        lastState === _t.FILTER &&\n        prevTokenType === _t.FILTER &&\n        token.type !== _t.PARENCLOSE &&\n        token.type !== _t.COMMA &&\n        token.type !== _t.OPERATOR &&\n        token.type !== _t.FILTER &&\n        token.type !== _t.FILTEREMPTY) {\n      self.out.push(', ');\n    }\n\n    if (lastState && lastState === _t.METHODOPEN) {\n      self.state.pop();\n      if (token.type !== _t.PARENCLOSE) {\n        self.out.push(', ');\n      }\n    }\n\n    switch (token.type) {\n    case _t.WHITESPACE:\n      break;\n\n    case _t.STRING:\n      self.filterApplyIdx.push(self.out.length);\n      self.out.push(match.replace(/\\\\/g, '\\\\\\\\'));\n      break;\n\n    case _t.NUMBER:\n    case _t.BOOL:\n      self.filterApplyIdx.push(self.out.length);\n      self.out.push(match);\n      break;\n\n    case _t.FILTER:\n      if (!self.filters.hasOwnProperty(match) || typeof self.filters[match] !== \"function\") {\n        utils.throwError('Invalid filter \"' + match + '\"', self.line, self.filename);\n      }\n      self.escape = self.filters[match].safe ? false : self.escape;\n      temp = self.filterApplyIdx.pop();\n      self.out.splice(temp, 0, '_filters[\"' + match + '\"](');\n      self.state.push(token.type);\n      self.filterApplyIdx.push(temp);\n      break;\n\n    case _t.FILTEREMPTY:\n      if (!self.filters.hasOwnProperty(match) || typeof self.filters[match] !== \"function\") {\n        utils.throwError('Invalid filter \"' + match + '\"', self.line, self.filename);\n      }\n      self.escape = self.filters[match].safe ? false : self.escape;\n      self.out.splice(self.filterApplyIdx[self.filterApplyIdx.length - 1], 0, '_filters[\"' + match + '\"](');\n      self.out.push(')');\n      break;\n\n    case _t.FUNCTION:\n    case _t.FUNCTIONEMPTY:\n      self.out.push('((typeof _ctx.' + match + ' !== \"undefined\") ? _ctx.' + match +\n        ' : ((typeof ' + match + ' !== \"undefined\") ? ' + match +\n        ' : _fn))(');\n      self.escape = false;\n      if (token.type === _t.FUNCTIONEMPTY) {\n        self.out[self.out.length - 1] = self.out[self.out.length - 1] + ')';\n      } else {\n        self.state.push(token.type);\n      }\n      self.filterApplyIdx.push(self.out.length - 1);\n      break;\n\n    case _t.PARENOPEN:\n      self.state.push(token.type);\n      if (self.filterApplyIdx.length) {\n        self.out.splice(self.filterApplyIdx[self.filterApplyIdx.length - 1], 0, '(');\n        if (prevToken && prevTokenType === _t.VAR) {\n          temp = prevToken.match.split('.').slice(0, -1);\n          self.out.push(' || _fn).call(' + self.checkMatch(temp));\n          self.state.push(_t.METHODOPEN);\n          self.escape = false;\n        } else {\n          self.out.push(' || _fn)(');\n        }\n        self.filterApplyIdx.push(self.out.length - 3);\n      } else {\n        self.out.push('(');\n        self.filterApplyIdx.push(self.out.length - 1);\n      }\n      break;\n\n    case _t.PARENCLOSE:\n      temp = self.state.pop();\n      if (temp !== _t.PARENOPEN && temp !== _t.FUNCTION && temp !== _t.FILTER) {\n        utils.throwError('Mismatched nesting state', self.line, self.filename);\n      }\n      self.out.push(')');\n      // Once off the previous entry\n      self.filterApplyIdx.pop();\n      // Once for the open paren\n      self.filterApplyIdx.pop();\n      break;\n\n    case _t.COMMA:\n      if (lastState !== _t.FUNCTION &&\n          lastState !== _t.FILTER &&\n          lastState !== _t.ARRAYOPEN &&\n          lastState !== _t.CURLYOPEN &&\n          lastState !== _t.PARENOPEN &&\n          lastState !== _t.COLON) {\n        utils.throwError('Unexpected comma', self.line, self.filename);\n      }\n      if (lastState === _t.COLON) {\n        self.state.pop();\n      }\n      self.out.push(', ');\n      self.filterApplyIdx.pop();\n      break;\n\n    case _t.LOGIC:\n    case _t.COMPARATOR:\n      if (!prevToken ||\n          prevTokenType === _t.COMMA ||\n          prevTokenType === token.type ||\n          prevTokenType === _t.BRACKETOPEN ||\n          prevTokenType === _t.CURLYOPEN ||\n          prevTokenType === _t.PARENOPEN ||\n          prevTokenType === _t.FUNCTION) {\n        utils.throwError('Unexpected logic', self.line, self.filename);\n      }\n      self.out.push(token.match);\n      break;\n\n    case _t.NOT:\n      self.out.push(token.match);\n      break;\n\n    case _t.VAR:\n      self.parseVar(token, match, lastState);\n      break;\n\n    case _t.BRACKETOPEN:\n      if (!prevToken ||\n          (prevTokenType !== _t.VAR &&\n            prevTokenType !== _t.BRACKETCLOSE &&\n            prevTokenType !== _t.PARENCLOSE)) {\n        self.state.push(_t.ARRAYOPEN);\n        self.filterApplyIdx.push(self.out.length);\n      } else {\n        self.state.push(token.type);\n      }\n      self.out.push('[');\n      break;\n\n    case _t.BRACKETCLOSE:\n      temp = self.state.pop();\n      if (temp !== _t.BRACKETOPEN && temp !== _t.ARRAYOPEN) {\n        utils.throwError('Unexpected closing square bracket', self.line, self.filename);\n      }\n      self.out.push(']');\n      self.filterApplyIdx.pop();\n      break;\n\n    case _t.CURLYOPEN:\n      self.state.push(token.type);\n      self.out.push('{');\n      self.filterApplyIdx.push(self.out.length - 1);\n      break;\n\n    case _t.COLON:\n      if (lastState !== _t.CURLYOPEN) {\n        utils.throwError('Unexpected colon', self.line, self.filename);\n      }\n      self.state.push(token.type);\n      self.out.push(':');\n      self.filterApplyIdx.pop();\n      break;\n\n    case _t.CURLYCLOSE:\n      if (lastState === _t.COLON) {\n        self.state.pop();\n      }\n      if (self.state.pop() !== _t.CURLYOPEN) {\n        utils.throwError('Unexpected closing curly brace', self.line, self.filename);\n      }\n      self.out.push('}');\n\n      self.filterApplyIdx.pop();\n      break;\n\n    case _t.DOTKEY:\n      if (!prevToken || (\n          prevTokenType !== _t.VAR &&\n          prevTokenType !== _t.BRACKETCLOSE &&\n          prevTokenType !== _t.DOTKEY &&\n          prevTokenType !== _t.PARENCLOSE &&\n          prevTokenType !== _t.FUNCTIONEMPTY &&\n          prevTokenType !== _t.FILTEREMPTY &&\n          prevTokenType !== _t.CURLYCLOSE\n        )) {\n        utils.throwError('Unexpected key \"' + match + '\"', self.line, self.filename);\n      }\n      self.out.push('.' + match);\n      break;\n\n    case _t.OPERATOR:\n      self.out.push(' ' + match + ' ');\n      self.filterApplyIdx.pop();\n      break;\n    }\n  },\n\n  /**\n   * Parse variable token\n   * @param  {{match: string, type: number, line: number}} token      Lexer token object.\n   * @param  {string} match       Shortcut for token.match\n   * @param  {number} lastState   Lexer token type state.\n   * @return {undefined}\n   * @private\n   */\n  parseVar: function (token, match, lastState) {\n    var self = this;\n\n    match = match.split('.');\n\n    if (_reserved.indexOf(match[0]) !== -1) {\n      utils.throwError('Reserved keyword \"' + match[0] + '\" attempted to be used as a variable', self.line, self.filename);\n    }\n\n    self.filterApplyIdx.push(self.out.length);\n    if (lastState === _t.CURLYOPEN) {\n      if (match.length > 1) {\n        utils.throwError('Unexpected dot', self.line, self.filename);\n      }\n      self.out.push(match[0]);\n      return;\n    }\n\n    self.out.push(self.checkMatch(match));\n  },\n\n  /**\n   * Return contextual dot-check string for a match\n   * @param  {string} match       Shortcut for token.match\n   * @private\n   */\n  checkMatch: function (match) {\n    var temp = match[0], result;\n\n    function checkDot(ctx) {\n      var c = ctx + temp,\n        m = match,\n        build = '';\n\n      build = '(typeof ' + c + ' !== \"undefined\"';\n      utils.each(m, function (v, i) {\n        if (i === 0) {\n          return;\n        }\n        build += ' && ' + c + '.' + v + ' !== undefined';\n        c += '.' + v;\n      });\n      build += ')';\n\n      return build;\n    }\n\n    function buildDot(ctx) {\n      return '(' + checkDot(ctx) + ' ? ' + ctx + match.join('.') + ' : \"\")';\n    }\n    result = '(' + checkDot('_ctx.') + ' ? ' + buildDot('_ctx.') + ' : ' + buildDot('') + ')';\n    return '(' + result + ' !== null ? ' + result + ' : ' + '\"\" )';\n  }\n};\n\n/**\n * Parse a source string into tokens that are ready for compilation.\n *\n * @example\n * exports.parse('{{ tacos }}', {}, tags, filters);\n * // => [{ compile: [Function], ... }]\n *\n * @param  {string} source  Swig template source.\n * @param  {object} opts    Swig options object.\n * @param  {object} tags    Keyed object of tags that can be parsed and compiled.\n * @param  {object} filters Keyed object of filters that may be applied to variables.\n * @return {array}          List of tokens ready for compilation.\n */\nexports.parse = function (source, opts, tags, filters) {\n  source = source.replace(/\\r\\n/g, '\\n');\n  var escape = opts.autoescape,\n    tagOpen = opts.tagControls[0],\n    tagClose = opts.tagControls[1],\n    varOpen = opts.varControls[0],\n    varClose = opts.varControls[1],\n    escapedTagOpen = escapeRegExp(tagOpen),\n    escapedTagClose = escapeRegExp(tagClose),\n    escapedVarOpen = escapeRegExp(varOpen),\n    escapedVarClose = escapeRegExp(varClose),\n    tagStrip = new RegExp('^' + escapedTagOpen + '-?\\\\s*-?|-?\\\\s*-?' + escapedTagClose + '$', 'g'),\n    tagStripBefore = new RegExp('^' + escapedTagOpen + '-'),\n    tagStripAfter = new RegExp('-' + escapedTagClose + '$'),\n    varStrip = new RegExp('^' + escapedVarOpen + '-?\\\\s*-?|-?\\\\s*-?' + escapedVarClose + '$', 'g'),\n    varStripBefore = new RegExp('^' + escapedVarOpen + '-'),\n    varStripAfter = new RegExp('-' + escapedVarClose + '$'),\n    cmtOpen = opts.cmtControls[0],\n    cmtClose = opts.cmtControls[1],\n    anyChar = '[\\\\s\\\\S]*?',\n    // Split the template source based on variable, tag, and comment blocks\n    // /(\\{%[\\s\\S]*?%\\}|\\{\\{[\\s\\S]*?\\}\\}|\\{#[\\s\\S]*?#\\})/\n    splitter = new RegExp(\n      '(' +\n        escapedVarOpen + anyChar + escapedVarClose + '|' +\n        escapeRegExp(cmtOpen) + anyChar + escapeRegExp(cmtClose) + '|' +\n        escapedTagOpen + anyChar + escapedTagClose +\n        ')'\n    ),\n    // splitter = new RegExp(\n    //   '(' +\n    //     escapedTagOpen + anyChar + escapedTagClose + '|' +\n    //     escapedVarOpen + anyChar + escapedVarClose + '|' +\n    //     escapeRegExp(cmtOpen) + anyChar + escapeRegExp(cmtClose) +\n    //     ')'\n    // ),\n    line = 1,\n    stack = [],\n    parent = null,\n    tokens = [],\n    blocks = {},\n    inRaw = false,\n    stripNext;\n\n  /**\n   * Parse a variable.\n   * @param  {string} str  String contents of the variable, between <i>{{</i> and <i>}}</i>\n   * @param  {number} line The line number that this variable starts on.\n   * @return {VarToken}      Parsed variable token object.\n   * @private\n   */\n  function parseVariable(str, line) {\n    var tokens = lexer.read(utils.strip(str)),\n      parser,\n      out;\n\n    parser = new TokenParser(tokens, filters, escape, line, opts.filename);\n    out = parser.parse().join('');\n\n    if (parser.state.length) {\n      utils.throwError('Unable to parse \"' + str + '\"', line, opts.filename);\n    }\n\n    /**\n     * A parsed variable token.\n     * @typedef {object} VarToken\n     * @property {function} compile Method for compiling this token.\n     */\n    return {\n      compile: function () {\n        return '_output += ' + out + ';\\n';\n      }\n    };\n  }\n  exports.parseVariable = parseVariable;\n\n  /**\n   * Parse a tag.\n   * @param  {string} str  String contents of the tag, between <i>{%</i> and <i>%}</i>\n   * @param  {number} line The line number that this tag starts on.\n   * @return {TagToken}      Parsed token object.\n   * @private\n   */\n  function parseTag(str, line) {\n    var tokens, parser, chunks, tagName, tag, args, last;\n\n    if (utils.startsWith(str, 'end')) {\n      last = stack[stack.length - 1];\n      if (last && last.name === str.split(/\\s+/)[0].replace(/^end/, '') && last.ends) {\n        switch (last.name) {\n        case 'autoescape':\n          escape = opts.autoescape;\n          break;\n        case 'raw':\n          inRaw = false;\n          break;\n        }\n        stack.pop();\n        return;\n      }\n\n      if (!inRaw) {\n        utils.throwError('Unexpected end of tag \"' + str.replace(/^end/, '') + '\"', line, opts.filename);\n      }\n    }\n\n    if (inRaw) {\n      return;\n    }\n\n    chunks = str.split(/\\s+(.+)?/);\n    tagName = chunks.shift();\n\n    if (!tags.hasOwnProperty(tagName)) {\n      utils.throwError('Unexpected tag \"' + str + '\"', line, opts.filename);\n    }\n\n    tokens = lexer.read(utils.strip(chunks.join(' ')));\n    parser = new TokenParser(tokens, filters, false, line, opts.filename);\n    tag = tags[tagName];\n\n    /**\n     * Define custom parsing methods for your tag.\n     * @callback parse\n     *\n     * @example\n     * exports.parse = function (str, line, parser, types, options) {\n     *   parser.on('start', function () {\n     *     // ...\n     *   });\n     *   parser.on(types.STRING, function (token) {\n     *     // ...\n     *   });\n     * };\n     *\n     * @param {string} str The full token string of the tag.\n     * @param {number} line The line number that this tag appears on.\n     * @param {TokenParser} parser A TokenParser instance.\n     * @param {TYPES} types Lexer token type enum.\n     * @param {TagToken[]} stack The current stack of open tags.\n     * @param {SwigOpts} options Swig Options Object.\n     */\n    if (!tag.parse(chunks[1], line, parser, _t, stack, opts)) {\n      utils.throwError('Unexpected tag \"' + tagName + '\"', line, opts.filename);\n    }\n\n    parser.parse();\n    args = parser.out;\n\n    switch (tagName) {\n    case 'autoescape':\n      escape = (args[0] !== 'false') ? args[0] : false;\n      break;\n    case 'raw':\n      inRaw = true;\n      break;\n    }\n\n    /**\n     * A parsed tag token.\n     * @typedef {Object} TagToken\n     * @property {compile} [compile] Method for compiling this token.\n     * @property {array} [args] Array of arguments for the tag.\n     * @property {Token[]} [content=[]] An array of tokens that are children of this Token.\n     * @property {boolean} [ends] Whether or not this tag requires an end tag.\n     * @property {string} name The name of this tag.\n     */\n    return {\n      block: !!tags[tagName].block,\n      compile: tag.compile,\n      args: args,\n      content: [],\n      ends: tag.ends,\n      name: tagName\n    };\n  }\n\n  /**\n   * Strip the whitespace from the previous token, if it is a string.\n   * @param  {object} token Parsed token.\n   * @return {object}       If the token was a string, trailing whitespace will be stripped.\n   */\n  function stripPrevToken(token) {\n    if (typeof token === 'string') {\n      token = token.replace(/\\s*$/, '');\n    }\n    return token;\n  }\n\n  /*!\n   * Loop over the source, split via the tag/var/comment regular expression splitter.\n   * Send each chunk to the appropriate parser.\n   */\n  utils.each(source.split(splitter), function (chunk) {\n    var token, lines, stripPrev, prevToken, prevChildToken;\n\n    if (!chunk) {\n      return;\n    }\n\n    // Is a comment?\n    if (!inRaw && utils.startsWith(chunk, cmtOpen) && utils.endsWith(chunk, cmtClose)) {\n      // do nuthin and keep going!\n      return;\n    }\n    // Is a variable?\n    if (!inRaw && utils.startsWith(chunk, varOpen) && utils.endsWith(chunk, varClose)) {\n      stripPrev = varStripBefore.test(chunk);\n      stripNext = varStripAfter.test(chunk);\n      token = parseVariable(chunk.replace(varStrip, ''), line);\n    // Is a tag?\n    } else if (utils.startsWith(chunk, tagOpen) && utils.endsWith(chunk, tagClose)) {\n      stripPrev = tagStripBefore.test(chunk);\n      stripNext = tagStripAfter.test(chunk);\n      token = parseTag(chunk.replace(tagStrip, ''), line);\n      if (token) {\n        if (token.name === 'extends') {\n          parent = token.args.join('').replace(/^\\'|\\'$/g, '').replace(/^\\\"|\\\"$/g, '');\n        }\n\n        if (token.block && (!stack.length || token.name === 'block')) {\n          blocks[token.args.join('')] = token;\n        }\n      }\n      if (inRaw && !token) {\n        token = chunk;\n      }\n    // Is a content string?\n    } else if (inRaw || (!utils.startsWith(chunk, cmtOpen) && !utils.endsWith(chunk, cmtClose))) {\n      token = (stripNext) ? chunk.replace(/^\\s*/, '') : chunk;\n      stripNext = false;\n    } else if (utils.startsWith(chunk, cmtOpen) && utils.endsWith(chunk, cmtClose)) {\n      return;\n    }\n\n    // Did this tag ask to strip previous whitespace? <code>{%- ... %}</code> or <code>{{- ... }}</code>\n    if (stripPrev && tokens.length) {\n      prevToken = tokens.pop();\n      if (typeof prevToken === 'string') {\n        prevToken = stripPrevToken(prevToken);\n      } else if (prevToken.content && prevToken.content.length) {\n        prevChildToken = stripPrevToken(prevToken.content.pop());\n        prevToken.content.push(prevChildToken);\n      }\n      tokens.push(prevToken);\n    }\n\n    // This was a comment that went somehow unparsed, so let's just keep going.\n    if (!token) {\n      return;\n    }\n\n    // If there's an open item in the stack, add this to its content.\n    if (stack.length) {\n      stack[stack.length - 1].content.push(token);\n    } else {\n      tokens.push(token);\n    }\n\n    // If the token is a tag that requires an end tag, open it on the stack.\n    if (token.name && token.ends) {\n      stack.push(token);\n    }\n\n    lines = chunk.match(/\\n/g);\n    line += (lines) ? lines.length : 0;\n  });\n\n  return {\n    name: opts.filename,\n    parent: parent,\n    tokens: tokens,\n    blocks: blocks\n  };\n};\n\n\n/**\n * Compile an array of tokens.\n * @param  {Token[]} template     An array of template tokens.\n * @param  {Templates[]} parents  Array of parent templates.\n * @param  {SwigOpts} [options]   Swig options object.\n * @param  {string} [blockName]   Name of the current block context.\n * @return {string}               Partial for a compiled JavaScript method that will output a rendered template.\n */\nexports.compile = function (template, parents, options, blockName) {\n  var out = '',\n    tokens = utils.isArray(template) ? template : template.tokens;\n\n  utils.each(tokens, function (token) {\n    var o;\n    if (typeof token === 'string') {\n      out += '_output += \"' + token.replace(/\\\\/g, '\\\\\\\\').replace(/\\n|\\r/g, '\\\\n').replace(/\"/g, '\\\\\"') + '\";\\n';\n      return;\n    }\n\n    /**\n     * Compile callback for VarToken and TagToken objects.\n     * @callback compile\n     *\n     * @example\n     * exports.compile = function (compiler, args, content, parents, options, blockName) {\n     *   if (args[0] === 'foo') {\n     *     return compiler(content, parents, options, blockName) + '\\n';\n     *   }\n     *   return '_output += \"fallback\";\\n';\n     * };\n     *\n     * @param {parserCompiler} compiler\n     * @param {array} [args] Array of parsed arguments on the for the token.\n     * @param {array} [content] Array of content within the token.\n     * @param {array} [parents] Array of parent templates for the current template context.\n     * @param {SwigOpts} [options] Swig Options Object\n     * @param {string} [blockName] Name of the direct block parent, if any.\n     */\n    o = token.compile(exports.compile, token.args ? token.args.slice(0) : [], token.content ? token.content.slice(0) : [], parents, options, blockName);\n    out += o || '';\n  });\n\n  return out;\n};\n\n},{\"./lexer\":23,\"./utils\":45}],28:[function(require,module,exports){\nvar utils = require('./utils'),\n  _tags = require('./tags'),\n  _filters = require('./filters'),\n  parser = require('./parser'),\n  dateformatter = require('./dateformatter'),\n  loaders = require('./loaders');\n\n/**\n * Swig version number as a string.\n * @example\n * if (swig.version === \"1.3.2\") { ... }\n *\n * @type {String}\n */\nexports.version = \"1.3.2\";\n\n/**\n * Swig Options Object. This object can be passed to many of the API-level Swig methods to control various aspects of the engine. All keys are optional.\n * @typedef {Object} SwigOpts\n * @property {boolean} autoescape  Controls whether or not variable output will automatically be escaped for safe HTML output. Defaults to <code data-language=\"js\">true</code>. Functions executed in variable statements will not be auto-escaped. Your application/functions should take care of their own auto-escaping.\n * @property {array}   varControls Open and close controls for variables. Defaults to <code data-language=\"js\">['{{', '}}']</code>.\n * @property {array}   tagControls Open and close controls for tags. Defaults to <code data-language=\"js\">['{%', '%}']</code>.\n * @property {array}   cmtControls Open and close controls for comments. Defaults to <code data-language=\"js\">['{#', '#}']</code>.\n * @property {object}  locals      Default variable context to be passed to <strong>all</strong> templates.\n * @property {CacheOptions} cache Cache control for templates. Defaults to saving in <code data-language=\"js\">'memory'</code>. Send <code data-language=\"js\">false</code> to disable. Send an object with <code data-language=\"js\">get</code> and <code data-language=\"js\">set</code> functions to customize.\n * @property {TemplateLoader} loader The method that Swig will use to load templates. Defaults to <var>swig.loaders.fs</var>.\n */\nvar defaultOptions = {\n    autoescape: true,\n    varControls: ['{{', '}}'],\n    tagControls: ['{%', '%}'],\n    cmtControls: ['{#', '#}'],\n    locals: {},\n    /**\n     * Cache control for templates. Defaults to saving all templates into memory.\n     * @typedef {boolean|string|object} CacheOptions\n     * @example\n     * // Default\n     * swig.setDefaults({ cache: 'memory' });\n     * @example\n     * // Disables caching in Swig.\n     * swig.setDefaults({ cache: false });\n     * @example\n     * // Custom cache storage and retrieval\n     * swig.setDefaults({\n     *   cache: {\n     *     get: function (key) { ... },\n     *     set: function (key, val) { ... }\n     *   }\n     * });\n     */\n    cache: 'memory',\n    /**\n     * Configure Swig to use either the <var>swig.loaders.fs</var> or <var>swig.loaders.memory</var> template loader. Or, you can write your own!\n     * For more information, please see the <a href=\"../loaders/\">Template Loaders documentation</a>.\n     * @typedef {class} TemplateLoader\n     * @example\n     * // Default, FileSystem loader\n     * swig.setDefaults({ loader: swig.loaders.fs() });\n     * @example\n     * // FileSystem loader allowing a base path\n     * // With this, you don't use relative URLs in your template references\n     * swig.setDefaults({ loader: swig.loaders.fs(__dirname + '/templates') });\n     * @example\n     * // Memory Loader\n     * swig.setDefaults({ loader: swig.loaders.memory({\n     *   layout: '{% block foo %}{% endblock %}',\n     *   page1: '{% extends \"layout\" %}{% block foo %}Tacos!{% endblock %}'\n     * })});\n     */\n    loader: loaders.fs()\n  },\n  defaultInstance;\n\n/**\n * Empty function, used in templates.\n * @return {string} Empty string\n * @private\n */\nfunction efn() { return ''; }\n\n/**\n * Validate the Swig options object.\n * @param  {?SwigOpts} options Swig options object.\n * @return {undefined}      This method will throw errors if anything is wrong.\n * @private\n */\nfunction validateOptions(options) {\n  if (!options) {\n    return;\n  }\n\n  utils.each(['varControls', 'tagControls', 'cmtControls'], function (key) {\n    if (!options.hasOwnProperty(key)) {\n      return;\n    }\n    if (!utils.isArray(options[key]) || options[key].length !== 2) {\n      throw new Error('Option \"' + key + '\" must be an array containing 2 different control strings.');\n    }\n    if (options[key][0] === options[key][1]) {\n      throw new Error('Option \"' + key + '\" open and close controls must not be the same.');\n    }\n    utils.each(options[key], function (a, i) {\n      if (a.length < 2) {\n        throw new Error('Option \"' + key + '\" ' + ((i) ? 'open ' : 'close ') + 'control must be at least 2 characters. Saw \"' + a + '\" instead.');\n      }\n    });\n  });\n\n  if (options.hasOwnProperty('cache')) {\n    if (options.cache && options.cache !== 'memory') {\n      if (!options.cache.get || !options.cache.set) {\n        throw new Error('Invalid cache option ' + JSON.stringify(options.cache) + ' found. Expected \"memory\" or { get: function (key) { ... }, set: function (key, value) { ... } }.');\n      }\n    }\n  }\n  if (options.hasOwnProperty('loader')) {\n    if (options.loader) {\n      if (!options.loader.load || !options.loader.resolve) {\n        throw new Error('Invalid loader option ' + JSON.stringify(options.loader) + ' found. Expected { load: function (pathname, cb) { ... }, resolve: function (to, from) { ... } }.');\n      }\n    }\n  }\n\n}\n\n/**\n * Set defaults for the base and all new Swig environments.\n *\n * @example\n * swig.setDefaults({ cache: false });\n * // => Disables Cache\n *\n * @example\n * swig.setDefaults({ locals: { now: function () { return new Date(); } }});\n * // => sets a globally accessible method for all template\n * //    contexts, allowing you to print the current date\n * // => {{ now()|date('F jS, Y') }}\n *\n * @param  {SwigOpts} [options={}] Swig options object.\n * @return {undefined}\n */\nexports.setDefaults = function (options) {\n  validateOptions(options);\n\n  var locals = utils.extend({}, defaultOptions.locals, options.locals || {});\n\n  utils.extend(defaultOptions, options);\n  defaultOptions.locals = locals;\n\n  defaultInstance.options = utils.extend(defaultInstance.options, options);\n};\n\n/**\n * Set the default TimeZone offset for date formatting via the date filter. This is a global setting and will affect all Swig environments, old or new.\n * @param  {number} offset Offset from GMT, in minutes.\n * @return {undefined}\n */\nexports.setDefaultTZOffset = function (offset) {\n  dateformatter.tzOffset = offset;\n};\n\n/**\n * Create a new, separate Swig compile/render environment.\n *\n * @example\n * var swig = require('swig');\n * var myswig = new swig.Swig({varControls: ['<%=', '%>']});\n * myswig.render('Tacos are <%= tacos =>!', { locals: { tacos: 'delicious' }});\n * // => Tacos are delicious!\n * swig.render('Tacos are <%= tacos =>!', { locals: { tacos: 'delicious' }});\n * // => 'Tacos are <%= tacos =>!'\n *\n * @param  {SwigOpts} [opts={}] Swig options object.\n * @return {object}      New Swig environment.\n */\nexports.Swig = function (opts) {\n  validateOptions(opts);\n  this.options = utils.extend({}, defaultOptions, opts || {});\n  this.cache = {};\n  this.extensions = {};\n  var self = this,\n    tags = _tags,\n    filters = _filters;\n\n  /**\n   * Get combined locals context.\n   * @param  {?SwigOpts} [options] Swig options object.\n   * @return {object}         Locals context.\n   * @private\n   */\n  function getLocals(options) {\n    if (!options || !options.locals) {\n      return self.options.locals;\n    }\n\n    return utils.extend({}, self.options.locals, options.locals);\n  }\n\n  /**\n   * Get compiled template from the cache.\n   * @param  {string} key           Name of template.\n   * @return {object|undefined}     Template function and tokens.\n   * @private\n   */\n  function cacheGet(key) {\n    if (!self.options.cache) {\n      return;\n    }\n\n    if (self.options.cache === 'memory') {\n      return self.cache[key];\n    }\n\n    return self.options.cache.get(key);\n  }\n\n  /**\n   * Store a template in the cache.\n   * @param  {string} key Name of template.\n   * @param  {object} val Template function and tokens.\n   * @return {undefined}\n   * @private\n   */\n  function cacheSet(key, val) {\n    if (!self.options.cache) {\n      return;\n    }\n\n    if (self.options.cache === 'memory') {\n      self.cache[key] = val;\n      return;\n    }\n\n    self.options.cache.set(key, val);\n  }\n\n  /**\n   * Clears the in-memory template cache.\n   *\n   * @example\n   * swig.invalidateCache();\n   *\n   * @return {undefined}\n   */\n  this.invalidateCache = function () {\n    if (self.options.cache === 'memory') {\n      self.cache = {};\n    }\n  };\n\n  /**\n   * Add a custom filter for swig variables.\n   *\n   * @example\n   * function replaceMs(input) { return input.replace(/m/g, 'f'); }\n   * swig.setFilter('replaceMs', replaceMs);\n   * // => {{ \"onomatopoeia\"|replaceMs }}\n   * // => onofatopeia\n   *\n   * @param {string}    name    Name of filter, used in templates. <strong>Will</strong> overwrite previously defined filters, if using the same name.\n   * @param {function}  method  Function that acts against the input. See <a href=\"/docs/filters/#custom\">Custom Filters</a> for more information.\n   * @return {undefined}\n   */\n  this.setFilter = function (name, method) {\n    if (typeof method !== \"function\") {\n      throw new Error('Filter \"' + name + '\" is not a valid function.');\n    }\n    filters[name] = method;\n  };\n\n  /**\n   * Add a custom tag. To expose your own extensions to compiled template code, see <code data-language=\"js\">swig.setExtension</code>.\n   *\n   * For a more in-depth explanation of writing custom tags, see <a href=\"../extending/#tags\">Custom Tags</a>.\n   *\n   * @example\n   * var tacotag = require('./tacotag');\n   * swig.setTag('tacos', tacotag.parse, tacotag.compile, tacotag.ends, tacotag.blockLevel);\n   * // => {% tacos %}Make this be tacos.{% endtacos %}\n   * // => Tacos tacos tacos tacos.\n   *\n   * @param  {string} name      Tag name.\n   * @param  {function} parse   Method for parsing tokens.\n   * @param  {function} compile Method for compiling renderable output.\n   * @param  {boolean} [ends=false]     Whether or not this tag requires an <i>end</i> tag.\n   * @param  {boolean} [blockLevel=false] If false, this tag will not be compiled outside of <code>block</code> tags when extending a parent template.\n   * @return {undefined}\n   */\n  this.setTag = function (name, parse, compile, ends, blockLevel) {\n    if (typeof parse !== 'function') {\n      throw new Error('Tag \"' + name + '\" parse method is not a valid function.');\n    }\n\n    if (typeof compile !== 'function') {\n      throw new Error('Tag \"' + name + '\" compile method is not a valid function.');\n    }\n\n    tags[name] = {\n      parse: parse,\n      compile: compile,\n      ends: ends || false,\n      block: !!blockLevel\n    };\n  };\n\n  /**\n   * Add extensions for custom tags. This allows any custom tag to access a globally available methods via a special globally available object, <var>_ext</var>, in templates.\n   *\n   * @example\n   * swig.setExtension('trans', function (v) { return translate(v); });\n   * function compileTrans(compiler, args, content, parent, options) {\n   *   return '_output += _ext.trans(' + args[0] + ');'\n   * };\n   * swig.setTag('trans', parseTrans, compileTrans, true);\n   *\n   * @param  {string} name   Key name of the extension. Accessed via <code data-language=\"js\">_ext[name]</code>.\n   * @param  {*}      object The method, value, or object that should be available via the given name.\n   * @return {undefined}\n   */\n  this.setExtension = function (name, object) {\n    self.extensions[name] = object;\n  };\n\n  /**\n   * Parse a given source string into tokens.\n   *\n   * @param  {string} source  Swig template source.\n   * @param  {SwigOpts} [options={}] Swig options object.\n   * @return {object} parsed  Template tokens object.\n   * @private\n   */\n  this.parse = function (source, options) {\n    validateOptions(options);\n\n    var locals = getLocals(options),\n      opts = {},\n      k;\n\n    for (k in options) {\n      if (options.hasOwnProperty(k) && k !== 'locals') {\n        opts[k] = options[k];\n      }\n    }\n\n    options = utils.extend({}, self.options, opts);\n    options.locals = locals;\n\n    return parser.parse(source, options, tags, filters);\n  };\n\n  /**\n   * Parse a given file into tokens.\n   *\n   * @param  {string} pathname  Full path to file to parse.\n   * @param  {SwigOpts} [options={}]   Swig options object.\n   * @return {object} parsed    Template tokens object.\n   * @private\n   */\n  this.parseFile = function (pathname, options) {\n    var src;\n\n    if (!options) {\n      options = {};\n    }\n\n    pathname = self.options.loader.resolve(pathname, options.resolveFrom);\n\n    src = self.options.loader.load(pathname);\n\n    if (!options.filename) {\n      options = utils.extend({ filename: pathname }, options);\n    }\n\n    return self.parse(src, options);\n  };\n\n  /**\n   * Re-Map blocks within a list of tokens to the template's block objects.\n   * @param  {array}  tokens   List of tokens for the parent object.\n   * @param  {object} template Current template that needs to be mapped to the  parent's block and token list.\n   * @return {array}\n   * @private\n   */\n  function remapBlocks(blocks, tokens) {\n    return utils.map(tokens, function (token) {\n      var args = token.args ? token.args.join('') : '';\n      if (token.name === 'block' && blocks[args]) {\n        token = blocks[args];\n      }\n      if (token.content && token.content.length) {\n        token.content = remapBlocks(blocks, token.content);\n      }\n      return token;\n    });\n  }\n\n  /**\n   * Import block-level tags to the token list that are not actual block tags.\n   * @param  {array} blocks List of block-level tags.\n   * @param  {array} tokens List of tokens to render.\n   * @return {undefined}\n   * @private\n   */\n  function importNonBlocks(blocks, tokens) {\n    utils.each(blocks, function (block) {\n      if (block.name !== 'block') {\n        tokens.unshift(block);\n      }\n    });\n  }\n\n  /**\n   * Recursively compile and get parents of given parsed token object.\n   *\n   * @param  {object} tokens    Parsed tokens from template.\n   * @param  {SwigOpts} [options={}]   Swig options object.\n   * @return {object}           Parsed tokens from parent templates.\n   * @private\n   */\n  function getParents(tokens, options) {\n    var parentName = tokens.parent,\n      parentFiles = [],\n      parents = [],\n      parentFile,\n      parent,\n      l;\n\n    while (parentName) {\n      if (!options || !options.filename) {\n        throw new Error('Cannot extend \"' + parentName + '\" because current template has no filename.');\n      }\n\n      parentFile = parentFile || options.filename;\n      parentFile = self.options.loader.resolve(parentName, parentFile);\n      parent = cacheGet(parentFile) || self.parseFile(parentFile, utils.extend({}, options, { filename: parentFile }));\n      parentName = parent.parent;\n\n      if (parentFiles.indexOf(parentFile) !== -1) {\n        throw new Error('Illegal circular extends of \"' + parentFile + '\".');\n      }\n      parentFiles.push(parentFile);\n\n      parents.push(parent);\n    }\n\n    // Remap each parents'(1) blocks onto its own parent(2), receiving the full token list for rendering the original parent(1) on its own.\n    l = parents.length;\n    for (l = parents.length - 2; l >= 0; l -= 1) {\n      parents[l].tokens = remapBlocks(parents[l].blocks, parents[l + 1].tokens);\n      importNonBlocks(parents[l].blocks, parents[l].tokens);\n    }\n\n    return parents;\n  }\n\n  /**\n   * Pre-compile a source string into a cache-able template function.\n   *\n   * @example\n   * swig.precompile('{{ tacos }}');\n   * // => {\n   * //      tpl: function (_swig, _locals, _filters, _utils, _fn) { ... },\n   * //      tokens: {\n   * //        name: undefined,\n   * //        parent: null,\n   * //        tokens: [...],\n   * //        blocks: {}\n   * //      }\n   * //    }\n   *\n   * In order to render a pre-compiled template, you must have access to filters and utils from Swig. <var>efn</var> is simply an empty function that does nothing.\n   *\n   * @param  {string} source  Swig template source string.\n   * @param  {SwigOpts} [options={}] Swig options object.\n   * @return {object}         Renderable function and tokens object.\n   */\n  this.precompile = function (source, options) {\n    var tokens = self.parse(source, options),\n      parents = getParents(tokens, options),\n      tpl;\n\n    if (parents.length) {\n      // Remap the templates first-parent's tokens using this template's blocks.\n      tokens.tokens = remapBlocks(tokens.blocks, parents[0].tokens);\n      importNonBlocks(tokens.blocks, tokens.tokens);\n    }\n\n    tpl = new Function('_swig', '_ctx', '_filters', '_utils', '_fn',\n      '  var _ext = _swig.extensions,\\n' +\n      '    _output = \"\";\\n' +\n      parser.compile(tokens, parents, options) + '\\n' +\n      '  return _output;\\n'\n      );\n\n    return { tpl: tpl, tokens: tokens };\n  };\n\n  /**\n   * Compile and render a template string for final output.\n   *\n   * When rendering a source string, a file path should be specified in the options object in order for <var>extends</var>, <var>include</var>, and <var>import</var> to work properly. Do this by adding <code data-language=\"js\">{ filename: '/absolute/path/to/mytpl.html' }</code> to the options argument.\n   *\n   * @example\n   * swig.render('{{ tacos }}', { locals: { tacos: 'Tacos!!!!' }});\n   * // => Tacos!!!!\n   *\n   * @param  {string} source    Swig template source string.\n   * @param  {SwigOpts} [options={}] Swig options object.\n   * @return {string}           Rendered output.\n   */\n  this.render = function (source, options) {\n    return self.compile(source, options)();\n  };\n\n  /**\n   * Compile and render a template file for final output. This is most useful for libraries like Express.js.\n   *\n   * @example\n   * swig.renderFile('./template.html', {}, function (err, output) {\n   *   if (err) {\n   *     throw err;\n   *   }\n   *   console.log(output);\n   * });\n   *\n   * @example\n   * swig.renderFile('./template.html', {});\n   * // => output\n   *\n   * @param  {string}   pathName    File location.\n   * @param  {object}   [locals={}] Template variable context.\n   * @param  {Function} [cb] Asyncronous callback function. If not provided, <var>compileFile</var> will run syncronously.\n   * @return {string}             Rendered output.\n   */\n  this.renderFile = function (pathName, locals, cb) {\n    if (cb) {\n      self.compileFile(pathName, {}, function (err, fn) {\n        var result;\n\n        if (err) {\n          cb(err);\n          return;\n        }\n\n        try {\n          result = fn(locals);\n        } catch (err2) {\n          cb(err2);\n          return;\n        }\n\n        cb(null, result);\n      });\n      return;\n    }\n\n    return self.compileFile(pathName)(locals);\n  };\n\n  /**\n   * Compile string source into a renderable template function.\n   *\n   * @example\n   * var tpl = swig.compile('{{ tacos }}');\n   * // => {\n   * //      [Function: compiled]\n   * //      parent: null,\n   * //      tokens: [{ compile: [Function] }],\n   * //      blocks: {}\n   * //    }\n   * tpl({ tacos: 'Tacos!!!!' });\n   * // => Tacos!!!!\n   *\n   * When compiling a source string, a file path should be specified in the options object in order for <var>extends</var>, <var>include</var>, and <var>import</var> to work properly. Do this by adding <code data-language=\"js\">{ filename: '/absolute/path/to/mytpl.html' }</code> to the options argument.\n   *\n   * @param  {string} source    Swig template source string.\n   * @param  {SwigOpts} [options={}] Swig options object.\n   * @return {function}         Renderable function with keys for parent, blocks, and tokens.\n   */\n  this.compile = function (source, options) {\n    var key = options ? options.filename : null,\n      cached = key ? cacheGet(key) : null,\n      context,\n      contextLength,\n      pre;\n\n    if (cached) {\n      return cached;\n    }\n\n    context = getLocals(options);\n    contextLength = utils.keys(context).length;\n    pre = this.precompile(source, options);\n\n    function compiled(locals) {\n      var lcls;\n      if (locals && contextLength) {\n        lcls = utils.extend({}, context, locals);\n      } else if (locals && !contextLength) {\n        lcls = locals;\n      } else if (!locals && contextLength) {\n        lcls = context;\n      } else {\n        lcls = {};\n      }\n      return pre.tpl(self, lcls, filters, utils, efn);\n    }\n\n    utils.extend(compiled, pre.tokens);\n\n    if (key) {\n      cacheSet(key, compiled);\n    }\n\n    return compiled;\n  };\n\n  /**\n   * Compile a source file into a renderable template function.\n   *\n   * @example\n   * var tpl = swig.compileFile('./mytpl.html');\n   * // => {\n   * //      [Function: compiled]\n   * //      parent: null,\n   * //      tokens: [{ compile: [Function] }],\n   * //      blocks: {}\n   * //    }\n   * tpl({ tacos: 'Tacos!!!!' });\n   * // => Tacos!!!!\n   *\n   * @example\n   * swig.compileFile('/myfile.txt', { varControls: ['<%=', '=%>'], tagControls: ['<%', '%>']});\n   * // => will compile 'myfile.txt' using the var and tag controls as specified.\n   *\n   * @param  {string} pathname  File location.\n   * @param  {SwigOpts} [options={}] Swig options object.\n   * @param  {Function} [cb] Asyncronous callback function. If not provided, <var>compileFile</var> will run syncronously.\n   * @return {function}         Renderable function with keys for parent, blocks, and tokens.\n   */\n  this.compileFile = function (pathname, options, cb) {\n    var src, cached;\n\n    if (!options) {\n      options = {};\n    }\n\n    pathname = self.options.loader.resolve(pathname, options.resolveFrom);\n    if (!options.filename) {\n      options = utils.extend({ filename: pathname }, options);\n    }\n    cached = cacheGet(pathname);\n\n    if (cached) {\n      if (cb) {\n        cb(null, cached);\n        return;\n      }\n      return cached;\n    }\n\n    if (cb) {\n      self.options.loader.load(pathname, function (err, src) {\n        if (err) {\n          cb(err);\n          return;\n        }\n        var compiled;\n\n        try {\n          compiled = self.compile(src, options);\n        } catch (err2) {\n          cb(err2);\n          return;\n        }\n\n        cb(err, compiled);\n      });\n      return;\n    }\n\n    src = self.options.loader.load(pathname);\n    return self.compile(src, options);\n  };\n\n  /**\n   * Run a pre-compiled template function. This is most useful in the browser when you've pre-compiled your templates with the Swig command-line tool.\n   *\n   * @example\n   * $ swig compile ./mytpl.html --wrap-start=\"var mytpl = \" > mytpl.js\n   * @example\n   * <script src=\"mytpl.js\"></script>\n   * <script>\n   *   swig.run(mytpl, {});\n   *   // => \"rendered template...\"\n   * </script>\n   *\n   * @param  {function} tpl       Pre-compiled Swig template function. Use the Swig CLI to compile your templates.\n   * @param  {object} [locals={}] Template variable context.\n   * @param  {string} [filepath]  Filename used for caching the template.\n   * @return {string}             Rendered output.\n   */\n  this.run = function (tpl, locals, filepath) {\n    var context = getLocals({ locals: locals });\n    if (filepath) {\n      cacheSet(filepath, tpl);\n    }\n    return tpl(self, context, filters, utils, efn);\n  };\n};\n\n/*!\n * Export methods publicly\n */\ndefaultInstance = new exports.Swig();\nexports.setFilter = defaultInstance.setFilter;\nexports.setTag = defaultInstance.setTag;\nexports.setExtension = defaultInstance.setExtension;\nexports.parseFile = defaultInstance.parseFile;\nexports.precompile = defaultInstance.precompile;\nexports.compile = defaultInstance.compile;\nexports.compileFile = defaultInstance.compileFile;\nexports.render = defaultInstance.render;\nexports.renderFile = defaultInstance.renderFile;\nexports.run = defaultInstance.run;\nexports.invalidateCache = defaultInstance.invalidateCache;\nexports.loaders = loaders;\n\n},{\"./dateformatter\":21,\"./filters\":22,\"./loaders\":25,\"./parser\":27,\"./tags\":39,\"./utils\":45}],29:[function(require,module,exports){\nvar utils = require('../utils'),\n  strings = ['html', 'js'];\n\n/**\n * Control auto-escaping of variable output from within your templates.\n *\n * @alias autoescape\n *\n * @example\n * // myvar = '<foo>';\n * {% autoescape true %}{{ myvar }}{% endautoescape %}\n * // => &lt;foo&gt;\n * {% autoescape false %}{{ myvar }}{% endautoescape %}\n * // => <foo>\n *\n * @param {boolean|string} control One of `true`, `false`, `\"js\"` or `\"html\"`.\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  return compiler(content, parents, options, blockName);\n};\nexports.parse = function (str, line, parser, types, stack, opts) {\n  var matched;\n  parser.on('*', function (token) {\n    if (!matched &&\n        (token.type === types.BOOL ||\n          (token.type === types.STRING && strings.indexOf(token.match) === -1))\n        ) {\n      this.out.push(token.match);\n      matched = true;\n      return;\n    }\n    utils.throwError('Unexpected token \"' + token.match + '\" in autoescape tag', line, opts.filename);\n  });\n\n  return true;\n};\nexports.ends = true;\n\n},{\"../utils\":45}],30:[function(require,module,exports){\n/**\n * Defines a block in a template that can be overridden by a template extending this one and/or will override the current template's parent template block of the same name.\n *\n * See <a href=\"#inheritance\">Template Inheritance</a> for more information.\n *\n * @alias block\n *\n * @example\n * {% block body %}...{% endblock %}\n *\n * @param {literal}  name   Name of the block for use in parent and extended templates.\n */\nexports.compile = function (compiler, args, content, parents, options) {\n  return compiler(content, parents, options, args.join(''));\n};\n\nexports.parse = function (str, line, parser) {\n  parser.on('*', function (token) {\n    this.out.push(token.match);\n  });\n  return true;\n};\n\nexports.ends = true;\nexports.block = true;\n\n},{}],31:[function(require,module,exports){\n/**\n * Used within an <code data-language=\"swig\">{% if %}</code> tag, the code block following this tag up until <code data-language=\"swig\">{% endif %}</code> will be rendered if the <i>if</i> statement returns false.\n *\n * @alias else\n *\n * @example\n * {% if false %}\n *   statement1\n * {% else %}\n *   statement2\n * {% endif %}\n * // => statement2\n *\n */\nexports.compile = function () {\n  return '} else {\\n';\n};\n\nexports.parse = function (str, line, parser, types, stack) {\n  parser.on('*', function (token) {\n    throw new Error('\"else\" tag does not accept any tokens. Found \"' + token.match + '\" on line ' + line + '.');\n  });\n\n  return (stack.length && stack[stack.length - 1].name === 'if');\n};\n\n},{}],32:[function(require,module,exports){\nvar ifparser = require('./if').parse;\n\n/**\n * Like <code data-language=\"swig\">{% else %}</code>, except this tag can take more conditional statements.\n *\n * @alias elseif\n * @alias elif\n *\n * @example\n * {% if false %}\n *   Tacos\n * {% elseif true %}\n *   Burritos\n * {% else %}\n *   Churros\n * {% endif %}\n * // => Burritos\n *\n * @param {...mixed} conditional  Conditional statement that returns a truthy or falsy value.\n */\nexports.compile = function (compiler, args) {\n  return '} else if (' + args.join(' ') + ') {\\n';\n};\n\nexports.parse = function (str, line, parser, types, stack) {\n  var okay = ifparser(str, line, parser, types, stack);\n  return okay && (stack.length && stack[stack.length - 1].name === 'if');\n};\n\n},{\"./if\":36}],33:[function(require,module,exports){\n/**\n * Makes the current template extend a parent template. This tag must be the first item in your template.\n *\n * See <a href=\"#inheritance\">Template Inheritance</a> for more information.\n *\n * @alias extends\n *\n * @example\n * {% extends \"./layout.html\" %}\n *\n * @param {string} parentFile  Relative path to the file that this template extends.\n */\nexports.compile = function () {};\n\nexports.parse = function () {\n  return true;\n};\n\nexports.ends = false;\n\n},{}],34:[function(require,module,exports){\nvar filters = require('../filters');\n\n/**\n * Apply a filter to an entire block of template.\n *\n * @alias filter\n *\n * @example\n * {% filter uppercase %}oh hi, {{ name }}{% endfilter %}\n * // => OH HI, PAUL\n *\n * @example\n * {% filter replace(\".\", \"!\", \"g\") %}Hi. My name is Paul.{% endfilter %}\n * // => Hi! My name is Paul!\n *\n * @param {function} filter  The filter that should be applied to the contents of the tag.\n */\n\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  var filter = args.shift().replace(/\\($/, ''),\n    val = '(function () {\\n' +\n      '  var _output = \"\";\\n' +\n      compiler(content, parents, options, blockName) +\n      '  return _output;\\n' +\n      '})()';\n\n  if (args[args.length - 1] === ')') {\n    args.pop();\n  }\n\n  args = (args.length) ? ', ' + args.join('') : '';\n  return '_output += _filters[\"' + filter + '\"](' + val + args + ');\\n';\n};\n\nexports.parse = function (str, line, parser, types) {\n  var filter;\n\n  function check(filter) {\n    if (!filters.hasOwnProperty(filter)) {\n      throw new Error('Filter \"' + filter + '\" does not exist on line ' + line + '.');\n    }\n  }\n\n  parser.on(types.FUNCTION, function (token) {\n    if (!filter) {\n      filter = token.match.replace(/\\($/, '');\n      check(filter);\n      this.out.push(token.match);\n      this.state.push(token.type);\n      return;\n    }\n    return true;\n  });\n\n  parser.on(types.VAR, function (token) {\n    if (!filter) {\n      filter = token.match;\n      check(filter);\n      this.out.push(filter);\n      return;\n    }\n    return true;\n  });\n\n  return true;\n};\n\nexports.ends = true;\n\n},{\"../filters\":22}],35:[function(require,module,exports){\nvar ctx = '_ctx.',\n  ctxloop = ctx + 'forloop',\n  ctxloopcache = ctx + '___loopcache';\n\n/**\n * Loop over objects and arrays.\n *\n * @alias for\n *\n * @example\n * // obj = { one: 'hi', two: 'bye' };\n * {% for x in obj %}\n *   {% if loop.first %}<ul>{% endif %}\n *   <li>{{ loop.index }} - {{ loop.key }}: {{ x }}</li>\n *   {% if loop.last %}</ul>{% endif %}\n * {% endfor %}\n * // => <ul>\n * //    <li>1 - one: hi</li>\n * //    <li>2 - two: bye</li>\n * //    </ul>\n *\n * @example\n * // arr = [1, 2, 3]\n * // Reverse the array, shortcut the key/index to `key`\n * {% for key, val in arr|reverse %}\n * {{ key }} -- {{ val }}\n * {% endfor %}\n * // => 0 -- 3\n * //    1 -- 2\n * //    2 -- 1\n *\n * @param {literal} [key]     A shortcut to the index of the array or current key accessor.\n * @param {literal} variable  The current value will be assigned to this variable name temporarily. The variable will be reset upon ending the for tag.\n * @param {literal} in        Literally, \"in\". This token is required.\n * @param {object}  object    An enumerable object that will be iterated over.\n *\n * @return {loop.index} The current iteration of the loop (1-indexed)\n * @return {loop.index0} The current iteration of the loop (0-indexed)\n * @return {loop.revindex} The number of iterations from the end of the loop (1-indexed)\n * @return {loop.revindex0} The number of iterations from the end of the loop (0-indexed)\n * @return {loop.key} If the iterator is an object, this will be the key of the current item, otherwise it will be the same as the loop.index.\n * @return {loop.first} True if the current object is the first in the object or array.\n * @return {loop.last} True if the current object is the last in the object or array.\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  var val = args.shift(),\n    key = '__k',\n    ctxloopcache = (ctx + '__loopcache' + Math.random()).replace(/\\./g, ''),\n    last;\n\n  if (args[0] && args[0] === ',') {\n    args.shift();\n    key = val;\n    val = args.shift();\n  }\n\n  last = args.join('');\n\n  return [\n    '(function () {\\n',\n    '  var __l = ' + last + ', __len = (_utils.isArray(__l)) ? __l.length : _utils.keys(__l).length;\\n',\n    '  if (!__l) { return; }\\n',\n    '  ' + ctxloopcache + ' = { forloop: ' + ctxloop + ', ' + val + ': ' + ctx + val + ', ' + key + ': ' + ctx + key + ' };\\n',\n    '  ' + ctxloop + ' = { first: false, index: 1, index0: 0, revindex: __len, revindex0: __len - 1, length: __len, last: false };\\n',\n    '  _utils.each(__l, function (' + val + ', ' + key + ') {\\n',\n    '    ' + ctx + val + ' = ' + val + ';\\n',\n    '    ' + ctx + key + ' = ' + key + ';\\n',\n    '    ' + ctxloop + '.key = ' + key + ';\\n',\n    '    ' + ctxloop + '.first = (' + ctxloop + '.index0 === 0);\\n',\n    '    ' + ctxloop + '.last = (' + ctxloop + '.revindex0 === 0);\\n',\n    '    ' + compiler(content, parents, options, blockName),\n    '    ' + ctxloop + '.index += 1; ' + ctxloop + '.index0 += 1; ' + ctxloop + '.revindex -= 1; ' + ctxloop + '.revindex0 -= 1;\\n',\n    '  });\\n',\n    '  ' + ctxloop + ' = ' + ctxloopcache + '.forloop;\\n',\n    '  ' + ctx + val + ' = ' + ctxloopcache + '.' + val + ';\\n',\n    '  ' + ctx + key + ' = ' + ctxloopcache + '.' + key + ';\\n',\n    '  ' + ctxloopcache + ' = undefined;\\n',\n    '})();\\n'\n  ].join('');\n};\n\nexports.parse = function (str, line, parser, types) {\n  var firstVar, ready;\n\n  parser.on(types.NUMBER, function (token) {\n    var lastState = this.state.length ? this.state[this.state.length - 1] : null;\n    if (!ready ||\n        (lastState !== types.ARRAYOPEN &&\n          lastState !== types.CURLYOPEN &&\n          lastState !== types.CURLYCLOSE &&\n          lastState !== types.FUNCTION &&\n          lastState !== types.FILTER)\n        ) {\n      throw new Error('Unexpected number \"' + token.match + '\" on line ' + line + '.');\n    }\n    return true;\n  });\n\n  parser.on(types.VAR, function (token) {\n    if (ready && firstVar) {\n      return true;\n    }\n\n    if (!this.out.length) {\n      firstVar = true;\n    }\n\n    this.out.push(token.match);\n  });\n\n  parser.on(types.COMMA, function (token) {\n    if (firstVar && this.prevToken.type === types.VAR) {\n      this.out.push(token.match);\n      return;\n    }\n\n    return true;\n  });\n\n  parser.on(types.COMPARATOR, function (token) {\n    if (token.match !== 'in' || !firstVar) {\n      throw new Error('Unexpected token \"' + token.match + '\" on line ' + line + '.');\n    }\n    ready = true;\n  });\n\n  return true;\n};\n\nexports.ends = true;\n\n},{}],36:[function(require,module,exports){\n/**\n * Used to create conditional statements in templates. Accepts most JavaScript valid comparisons.\n *\n * Can be used in conjunction with <a href=\"#elseif\"><code data-language=\"swig\">{% elseif ... %}</code></a> and <a href=\"#else\"><code data-language=\"swig\">{% else %}</code></a> tags.\n *\n * @alias if\n *\n * @example\n * {% if x %}{% endif %}\n * {% if !x %}{% endif %}\n * {% if not x %}{% endif %}\n *\n * @example\n * {% if x and y %}{% endif %}\n * {% if x && y %}{% endif %}\n * {% if x or y %}{% endif %}\n * {% if x || y %}{% endif %}\n * {% if x || (y && z) %}{% endif %}\n *\n * @example\n * {% if x [operator] y %}\n *   Operators: ==, !=, <, <=, >, >=, ===, !==\n * {% endif %}\n *\n * @example\n * {% if x == 'five' %}\n *   The operands can be also be string or number literals\n * {% endif %}\n *\n * @example\n * {% if x|lower === 'tacos' %}\n *   You can use filters on any operand in the statement.\n * {% endif %}\n *\n * @example\n * {% if x in y %}\n *   If x is a value that is present in y, this will return true.\n * {% endif %}\n *\n * @param {...mixed} conditional Conditional statement that returns a truthy or falsy value.\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  return 'if (' + args.join(' ') + ') { \\n' +\n    compiler(content, parents, options, blockName) + '\\n' +\n    '}';\n};\n\nexports.parse = function (str, line, parser, types) {\n  if (typeof str === \"undefined\") {\n    throw new Error('No conditional statement provided on line ' + line + '.');\n  }\n\n  parser.on(types.COMPARATOR, function (token) {\n    if (this.isLast) {\n      throw new Error('Unexpected logic \"' + token.match + '\" on line ' + line + '.');\n    }\n    if (this.prevToken.type === types.NOT) {\n      throw new Error('Attempted logic \"not ' + token.match + '\" on line ' + line + '. Use !(foo ' + token.match + ') instead.');\n    }\n    this.out.push(token.match);\n  });\n\n  parser.on(types.NOT, function (token) {\n    if (this.isLast) {\n      throw new Error('Unexpected logic \"' + token.match + '\" on line ' + line + '.');\n    }\n    this.out.push(token.match);\n  });\n\n  parser.on(types.BOOL, function (token) {\n    this.out.push(token.match);\n  });\n\n  parser.on(types.LOGIC, function (token) {\n    if (!this.out.length || this.isLast) {\n      throw new Error('Unexpected logic \"' + token.match + '\" on line ' + line + '.');\n    }\n    this.out.push(token.match);\n    this.filterApplyIdx.pop();\n  });\n\n  return true;\n};\n\nexports.ends = true;\n\n},{}],37:[function(require,module,exports){\nvar utils = require('../utils');\n\n/**\n * Allows you to import macros from another file directly into your current context.\n * The import tag is specifically designed for importing macros into your template with a specific context scope. This is very useful for keeping your macros from overriding template context that is being injected by your server-side page generation.\n *\n * @alias import\n *\n * @example\n * {% import './formmacros.html' as forms %}\n * {{ form.input(\"text\", \"name\") }}\n * // => <input type=\"text\" name=\"name\">\n *\n * @example\n * {% import \"../shared/tags.html\" as tags %}\n * {{ tags.stylesheet('global') }}\n * // => <link rel=\"stylesheet\" href=\"/global.css\">\n *\n * @param {string|var}  file      Relative path from the current template file to the file to import macros from.\n * @param {literal}     as        Literally, \"as\".\n * @param {literal}     varname   Local-accessible object name to assign the macros to.\n */\nexports.compile = function (compiler, args) {\n  var ctx = args.pop(),\n    out = '_ctx.' + ctx + ' = {};\\n  var _output = \"\";\\n',\n    replacements = utils.map(args, function (arg) {\n      return {\n        ex: new RegExp('_ctx.' + arg.name, 'g'),\n        re: '_ctx.' + ctx + '.' + arg.name\n      };\n    });\n\n  // Replace all occurrences of all macros in this file with\n  // proper namespaced definitions and calls\n  utils.each(args, function (arg) {\n    var c = arg.compiled;\n    utils.each(replacements, function (re) {\n      c = c.replace(re.ex, re.re);\n    });\n    out += c;\n  });\n\n  return out;\n};\n\nexports.parse = function (str, line, parser, types, stack, opts) {\n  var parseFile = require('../swig').parseFile,\n    compiler = require('../parser').compile,\n    parseOpts = { resolveFrom: opts.filename },\n    compileOpts = utils.extend({}, opts, parseOpts),\n    tokens,\n    ctx;\n\n  parser.on(types.STRING, function (token) {\n    var self = this;\n    if (!tokens) {\n      tokens = parseFile(token.match.replace(/^(\"|')|(\"|')$/g, ''), parseOpts).tokens;\n      utils.each(tokens, function (token) {\n        var out = '',\n          macroName;\n        if (!token || token.name !== 'macro' || !token.compile) {\n          return;\n        }\n        macroName = token.args[0];\n        out += token.compile(compiler, token.args, token.content, [], compileOpts) + '\\n';\n        self.out.push({compiled: out, name: macroName});\n      });\n      return;\n    }\n\n    throw new Error('Unexpected string ' + token.match + ' on line ' + line + '.');\n  });\n\n  parser.on(types.VAR, function (token) {\n    var self = this;\n    if (!tokens || ctx) {\n      throw new Error('Unexpected variable \"' + token.match + '\" on line ' + line + '.');\n    }\n\n    if (token.match === 'as') {\n      return;\n    }\n\n    ctx = token.match;\n    self.out.push(ctx);\n    return false;\n  });\n\n  return true;\n};\n\nexports.block = true;\n\n},{\"../parser\":27,\"../swig\":28,\"../utils\":45}],38:[function(require,module,exports){\nvar ignore = 'ignore',\n  missing = 'missing',\n  only = 'only',\n  alreadyWrappedRE = /^(['\"]).*\\1$/;\n\n/**\n * Includes a template partial in place. The template is rendered within the current locals variable context.\n *\n * @alias include\n *\n * @example\n * // food = 'burritos';\n * // drink = 'lemonade';\n * {% include \"./partial.html\" %}\n * // => I like burritos and lemonade.\n *\n * @example\n * // my_obj = { food: 'tacos', drink: 'horchata' };\n * {% include \"./partial.html\" with my_obj only %}\n * // => I like tacos and horchata.\n *\n * @example\n * {% include \"./partial.html\" with my_obj drink=\"agua de jamaica\" %}\n * // => I like tacos and agua de jamaica.\n *\n * @example\n * {% include \"/this/file/does/not/exist\" ignore missing %}\n * // => (Nothing! empty string)\n *\n * @param {string|var}  file      The path, relative to the template root, to render into the current context.\n * @param {literal}     [with]    Literally, \"with\".\n * @param {object}      [context] Local variable key-value object context to provide to the included file.\n * @param {literal}     [only]    Restricts to <strong>only</strong> passing the <code>with context</code> as local variables–the included template will not be aware of any other local variables in the parent template. For best performance, usage of this option is recommended if possible.\n * @param {literal}     [ignore missing] Will output empty string if not found instead of throwing an error.\n */\nexports.compile = function (compiler, args, content, parents, options) {\n  var i,\n    file = args.shift(),\n    onlyIdx = args.indexOf(only),\n    onlyCtx = onlyIdx !== -1 ? args.splice(onlyIdx, 1) : false,\n    parentFile = (args.pop() || '').replace(/\\\\/g, '\\\\\\\\'),\n    ignore = args[args.length - 1] === missing ? (args.pop()) : false,\n    w = '',\n    addl = '{',\n    arg;\n  while (args.length) {\n    arg = args.shift();\n    if (typeof arg === \"string\") {\n      w = w + arg;\n    } else {\n      for (i in arg) {\n        if (arg.hasOwnProperty(i)) {\n          addl = addl + \" \\\"\" + i + \"\\\": \" + arg[i] + \",\";\n        }\n      }\n    }\n  }\n  addl = addl.substring(0, addl.length - 1);\n  if (addl) {\n    addl = addl += \"}\";\n    if (w) {\n      w = \"_utils.extend({}, \" + w + ',' + addl + \")\";\n    } else {\n      w = addl;\n    }\n  }\n\n  return (ignore ? '  try {\\n' : '') +\n    '_output += _swig.compileFile(' + file + ', {' +\n    'resolveFrom: \"' + parentFile + '\"' +\n    '})(' +\n    ((onlyCtx && w) ? w : (!w ? '_ctx' : '_utils.extend({}, _ctx, ' + w + ')')) +\n    ');\\n' +\n    (ignore ? '} catch (e) {}\\n' : '');\n};\n\nexports.parse = function (str, line, parser, types, stack, opts) {\n  var file, w, addl = false,\n    addlCtx = {}, addlKey;\n  parser.on(types.STRING, function (token) {\n    if (!file) {\n      file = token.match;\n      this.out.push(file);\n      return;\n    }\n    if (this.prevToken.type === types.ASSIGNMENT) {\n      addlCtx[addlKey] = token.match.match(alreadyWrappedRE) ? token.match.replace(/'/g, '\\\\\\'') : '\"' + token.match.replace(/'/g, '\\\\\\'') + '\"';\n      return false;\n    }\n    return true;\n  });\n\n  parser.on(types.VAR, function (token) {\n    if (!file) {\n      file = token.match;\n      return true;\n    }\n\n    if (!w && token.match === 'with') {\n      w = true;\n      return;\n    }\n\n    if (w && token.match === only && this.prevToken.match !== 'with') {\n      this.out.push(token.match);\n      return;\n    }\n\n    if (token.match === ignore) {\n      return false;\n    }\n\n    if (token.match === missing) {\n      if (this.prevToken.match !== ignore) {\n        throw new Error('Unexpected token \"' + missing + '\" on line ' + line + '.');\n      }\n      this.out.push(token.match);\n      return false;\n    }\n\n    if (this.prevToken.match === ignore) {\n      throw new Error('Expected \"' + missing + '\" on line ' + line + ' but found \"' + token.match + '\".');\n    }\n\n    if (this.prevToken.type === types.ASSIGNMENT) {\n      addlCtx[addlKey] = parser.checkMatch(token.match.split('.'));\n      return false;\n    }\n\n\n    if (w) {\n      addlKey = token.match;\n      return false;\n    }\n\n    return true;\n  });\n\n\n  parser.on(types.ASSIGNMENT, function (token) {\n    addl = true;\n    return false;\n  });\n\n  parser.on('end', function () {\n    if (addl) {\n      this.out.push(addlCtx);\n    }\n    if (addlKey && !addl) {\n      this.out.push(parser.checkMatch(addlKey.split('.')));\n    }\n    this.out.push(opts.filename || null);\n  });\n\n  return true;\n};\n\n},{}],39:[function(require,module,exports){\nexports.autoescape = require('./autoescape');\nexports.block = require('./block');\nexports[\"else\"] = require('./else');\nexports.elseif = require('./elseif');\nexports.elif = exports.elseif;\nexports[\"extends\"] = require('./extends');\nexports.filter = require('./filter');\nexports[\"for\"] = require('./for');\nexports[\"if\"] = require('./if');\nexports[\"import\"] = require('./import');\nexports.include = require('./include');\nexports.macro = require('./macro');\nexports.parent = require('./parent');\nexports.raw = require('./raw');\nexports.set = require('./set');\nexports.spaceless = require('./spaceless');\n\n},{\"./autoescape\":29,\"./block\":30,\"./else\":31,\"./elseif\":32,\"./extends\":33,\"./filter\":34,\"./for\":35,\"./if\":36,\"./import\":37,\"./include\":38,\"./macro\":40,\"./parent\":41,\"./raw\":42,\"./set\":43,\"./spaceless\":44}],40:[function(require,module,exports){\n/**\n * Create custom, reusable snippets within your templates.\n * Can be imported from one template to another using the <a href=\"#import\"><code data-language=\"swig\">{% import ... %}</code></a> tag.\n *\n * @alias macro\n *\n * @example\n * {% macro input(type, name, id, label, value, error) %}\n *   <label for=\"{{ name }}\">{{ label }}</label>\n *   <input type=\"{{ type }}\" name=\"{{ name }}\" id=\"{{ id }}\" value=\"{{ value }}\"{% if error %} class=\"error\"{% endif %}>\n * {% endmacro %}\n *\n * {{ input(\"text\", \"fname\", \"fname\", \"First Name\", fname.value, fname.errors) }}\n * // => <label for=\"fname\">First Name</label>\n * //    <input type=\"text\" name=\"fname\" id=\"fname\" value=\"\">\n *\n * @param {...arguments} arguments  User-defined arguments.\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  var fnName = args.shift();\n\n  return '_ctx.' + fnName + ' = function (' + args.join('') + ') {\\n' +\n    '  var _output = \"\";\\n' +\n    compiler(content, parents, options, blockName) + '\\n' +\n    '  return _output;\\n' +\n    '};\\n' +\n    '_ctx.' + fnName + '.safe = true;\\n';\n};\n\nexports.parse = function (str, line, parser, types) {\n  var name;\n\n  parser.on(types.VAR, function (token) {\n    if (token.match.indexOf('.') !== -1) {\n      throw new Error('Unexpected dot in macro argument \"' + token.match + '\" on line ' + line + '.');\n    }\n    this.out.push(token.match);\n  });\n\n  parser.on(types.FUNCTION, function (token) {\n    if (!name) {\n      name = token.match;\n      this.out.push(name);\n      this.state.push(types.FUNCTION);\n    }\n  });\n\n  parser.on(types.FUNCTIONEMPTY, function (token) {\n    if (!name) {\n      name = token.match;\n      this.out.push(name);\n    }\n  });\n\n  parser.on(types.PARENCLOSE, function () {\n    if (this.isLast) {\n      return;\n    }\n    throw new Error('Unexpected parenthesis close on line ' + line + '.');\n  });\n\n  parser.on(types.COMMA, function () {\n    return true;\n  });\n\n  parser.on('*', function () {\n    return;\n  });\n\n  return true;\n};\n\nexports.ends = true;\nexports.block = true;\n\n},{}],41:[function(require,module,exports){\n/**\n * Inject the content from the parent template's block of the same name into the current block.\n *\n * See <a href=\"#inheritance\">Template Inheritance</a> for more information.\n *\n * @alias parent\n *\n * @example\n * {% extends \"./foo.html\" %}\n * {% block content %}\n *   My content.\n *   {% parent %}\n * {% endblock %}\n *\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  if (!parents || !parents.length) {\n    return '';\n  }\n\n  var parentFile = args[0],\n    breaker = true,\n    l = parents.length,\n    i = 0,\n    parent,\n    block;\n\n  for (i; i < l; i += 1) {\n    parent = parents[i];\n    if (!parent.blocks || !parent.blocks.hasOwnProperty(blockName)) {\n      continue;\n    }\n    // Silly JSLint \"Strange Loop\" requires return to be in a conditional\n    if (breaker && parentFile !== parent.name) {\n      block = parent.blocks[blockName];\n      return block.compile(compiler, [blockName], block.content, parents.slice(i + 1), options) + '\\n';\n    }\n  }\n};\n\nexports.parse = function (str, line, parser, types, stack, opts) {\n  parser.on('*', function (token) {\n    throw new Error('Unexpected argument \"' + token.match + '\" on line ' + line + '.');\n  });\n\n  parser.on('end', function () {\n    this.out.push(opts.filename);\n  });\n\n  return true;\n};\n\n},{}],42:[function(require,module,exports){\n// Magic tag, hardcoded into parser\n\n/**\n * Forces the content to not be auto-escaped. All swig instructions will be ignored and the content will be rendered exactly as it was given.\n *\n * @alias raw\n *\n * @example\n * // foobar = '<p>'\n * {% raw %}{{ foobar }}{% endraw %}\n * // => {{ foobar }}\n *\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  return compiler(content, parents, options, blockName);\n};\nexports.parse = function (str, line, parser) {\n  parser.on('*', function (token) {\n    throw new Error('Unexpected token \"' + token.match + '\" in raw tag on line ' + line + '.');\n  });\n  return true;\n};\nexports.ends = true;\n\n},{}],43:[function(require,module,exports){\n/**\n * Set a variable for re-use in the current context. This will over-write any value already set to the context for the given <var>varname</var>.\n *\n * @alias set\n *\n * @example\n * {% set foo = \"anything!\" %}\n * {{ foo }}\n * // => anything!\n *\n * @example\n * // index = 2;\n * {% set bar = 1 %}\n * {% set bar += index|default(3) %}\n * // => 3\n *\n * @example\n * // foods = {};\n * // food = 'chili';\n * {% set foods[food] = \"con queso\" %}\n * {{ foods.chili }}\n * // => con queso\n *\n * @example\n * // foods = { chili: 'chili con queso' }\n * {% set foods.chili = \"guatamalan insanity pepper\" %}\n * {{ foods.chili }}\n * // => guatamalan insanity pepper\n *\n * @param {literal} varname   The variable name to assign the value to.\n * @param {literal} assignement   Any valid JavaScript assignement. <code data-language=\"js\">=, +=, *=, /=, -=</code>\n * @param {*}   value     Valid variable output.\n */\nexports.compile = function (compiler, args) {\n  return args.join(' ') + ';\\n';\n};\n\nexports.parse = function (str, line, parser, types) {\n  var nameSet = '',\n    propertyName;\n\n  parser.on(types.VAR, function (token) {\n    if (propertyName) {\n      // Tell the parser where to find the variable\n      propertyName += '_ctx.' + token.match;\n      return;\n    }\n\n    if (!parser.out.length) {\n      nameSet += token.match;\n      return;\n    }\n\n    return true;\n  });\n\n  parser.on(types.BRACKETOPEN, function (token) {\n    if (!propertyName && !this.out.length) {\n      propertyName = token.match;\n      return;\n    }\n\n    return true;\n  });\n\n  parser.on(types.STRING, function (token) {\n    if (propertyName && !this.out.length) {\n      propertyName += token.match;\n      return;\n    }\n\n    return true;\n  });\n\n  parser.on(types.BRACKETCLOSE, function (token) {\n    if (propertyName && !this.out.length) {\n      nameSet += propertyName + token.match;\n      propertyName = undefined;\n      return;\n    }\n\n    return true;\n  });\n\n  parser.on(types.DOTKEY, function (token) {\n    if (!propertyName && !nameSet) {\n      return true;\n    }\n    nameSet += '.' + token.match;\n    return;\n  });\n\n  parser.on(types.ASSIGNMENT, function (token) {\n    if (this.out.length || !nameSet) {\n      throw new Error('Unexpected assignment \"' + token.match + '\" on line ' + line + '.');\n    }\n\n    this.out.push(\n      // Prevent the set from spilling into global scope\n      '_ctx.' + nameSet\n    );\n    this.out.push(token.match);\n  });\n\n  return true;\n};\n\nexports.block = true;\n\n},{}],44:[function(require,module,exports){\nvar utils = require('../utils');\n\n/**\n * Attempts to remove whitespace between HTML tags. Use at your own risk.\n *\n * @alias spaceless\n *\n * @example\n * {% spaceless %}\n *   {% for num in foo %}\n *   <li>{{ loop.index }}</li>\n *   {% endfor %}\n * {% endspaceless %}\n * // => <li>1</li><li>2</li><li>3</li>\n *\n */\nexports.compile = function (compiler, args, content, parents, options, blockName) {\n  function stripWhitespace(tokens) {\n    return utils.map(tokens, function (token) {\n      if (token.content || typeof token !== 'string') {\n        token.content = stripWhitespace(token.content);\n        return token;\n      }\n\n      return token.replace(/^\\s+/, '')\n        .replace(/>\\s+</g, '><')\n        .replace(/\\s+$/, '');\n    });\n  }\n\n  return compiler(stripWhitespace(content), parents, options, blockName);\n};\n\nexports.parse = function (str, line, parser) {\n  parser.on('*', function (token) {\n    throw new Error('Unexpected token \"' + token.match + '\" on line ' + line + '.');\n  });\n\n  return true;\n};\n\nexports.ends = true;\n\n},{\"../utils\":45}],45:[function(require,module,exports){\nvar isArray;\n\n/**\n * Strip leading and trailing whitespace from a string.\n * @param  {string} input\n * @return {string}       Stripped input.\n */\nexports.strip = function (input) {\n  return input.replace(/^\\s+|\\s+$/g, '');\n};\n\n/**\n * Test if a string starts with a given prefix.\n * @param  {string} str    String to test against.\n * @param  {string} prefix Prefix to check for.\n * @return {boolean}\n */\nexports.startsWith = function (str, prefix) {\n  return str.indexOf(prefix) === 0;\n};\n\n/**\n * Test if a string ends with a given suffix.\n * @param  {string} str    String to test against.\n * @param  {string} suffix Suffix to check for.\n * @return {boolean}\n */\nexports.endsWith = function (str, suffix) {\n  return str.indexOf(suffix, str.length - suffix.length) !== -1;\n};\n\n/**\n * Iterate over an array or object.\n * @param  {array|object} obj Enumerable object.\n * @param  {Function}     fn  Callback function executed for each item.\n * @return {array|object}     The original input object.\n */\nexports.each = function (obj, fn) {\n  var i, l;\n\n  if (isArray(obj)) {\n    i = 0;\n    l = obj.length;\n    for (i; i < l; i += 1) {\n      if (fn(obj[i], i, obj) === false) {\n        break;\n      }\n    }\n  } else {\n    for (i in obj) {\n      if (obj.hasOwnProperty(i)) {\n        if (fn(obj[i], i, obj) === false) {\n          break;\n        }\n      }\n    }\n  }\n\n  return obj;\n};\n\n/**\n * Test if an object is an Array.\n * @param {object} obj\n * @return {boolean}\n */\nexports.isArray = isArray = (Array.hasOwnProperty('isArray')) ? Array.isArray : function (obj) {\n  return (obj) ? (typeof obj === 'object' && Object.prototype.toString.call(obj).indexOf('[object Array]') !== -1) : false;\n};\n\n/**\n * Test if an item in an enumerable matches your conditions.\n * @param  {array|object}   obj   Enumerable object.\n * @param  {Function}       fn    Executed for each item. Return true if your condition is met.\n * @return {boolean}\n */\nexports.some = function (obj, fn) {\n  var i = 0,\n    result,\n    l;\n  if (isArray(obj)) {\n    l = obj.length;\n\n    for (i; i < l; i += 1) {\n      result = fn(obj[i], i, obj);\n      if (result) {\n        break;\n      }\n    }\n  } else {\n    exports.each(obj, function (value, index) {\n      result = fn(value, index, obj);\n      return !(result);\n    });\n  }\n  return !!result;\n};\n\n/**\n * Return a new enumerable, mapped by a given iteration function.\n * @param  {object}   obj Enumerable object.\n * @param  {Function} fn  Executed for each item. Return the item to replace the original item with.\n * @return {object}       New mapped object.\n */\nexports.map = function (obj, fn) {\n  var i = 0,\n    result = [],\n    l;\n\n  if (isArray(obj)) {\n    l = obj.length;\n    for (i; i < l; i += 1) {\n      result[i] = fn(obj[i], i);\n    }\n  } else {\n    for (i in obj) {\n      if (obj.hasOwnProperty(i)) {\n        result[i] = fn(obj[i], i);\n      }\n    }\n  }\n  return result;\n};\n\n/**\n * Copy all of the properties in the source objects over to the destination object, and return the destination object. It's in-order, so the last source will override properties of the same name in previous arguments.\n * @param {...object} arguments\n * @return {object}\n */\nexports.extend = function () {\n  var args = arguments,\n    target = args[0],\n    objs = (args.length > 1) ? Array.prototype.slice.call(args, 1) : [],\n    i = 0,\n    l = objs.length,\n    key,\n    obj;\n\n  for (i; i < l; i += 1) {\n    obj = objs[i] || {};\n    for (key in obj) {\n      if (obj.hasOwnProperty(key)) {\n        target[key] = obj[key];\n      }\n    }\n  }\n  return target;\n};\n\n/**\n * Get all of the keys on an object.\n * @param  {object} obj\n * @return {array}\n */\nexports.keys = function (obj) {\n  if (!obj) {\n    return [];\n  }\n\n  if (Object.keys) {\n    return Object.keys(obj);\n  }\n\n  return exports.map(obj, function (v, k) {\n    return k;\n  });\n};\n\n/**\n * Throw an error with possible line number and source file.\n * @param  {string} message Error message\n * @param  {number} [line]  Line number in template.\n * @param  {string} [file]  Template file the error occured in.\n * @throws {Error} No seriously, the point is to throw an error.\n */\nexports.throwError = function (message, line, file) {\n  if (line) {\n    message += ' on line ' + line;\n  }\n  if (file) {\n    message += ' in file ' + file;\n  }\n  throw new Error(message + '.');\n};\n\n},{}]},{},[1]);\n";

module.exports = function(context, callback) {

  var productClient = productClientFactory(context);
  var searchClient = searchClientFactory(context);
  productClient.context["user-claims"] = searchClient.context["user-claims"] = null;

  var qs = querystring.parse(url.parse(context.request.url)
    .query);

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
    } catch (e) {
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
      console.log('shortcut!');
      productClient.getProduct({
          productCode: syndicateQueries[0].productCodes[0]
        })
        .then(function(prod) {
          var finalResponse = {};
          finalResponse[syndicateQueries[0].id] = {
            items: [prod]
          };
          finishResponse(finalResponse);
        })
        .catch(callback);
    } else {

      var apiCalls = syndicateQueries.map(function(query) {
        if (query.productCodes) {
          return searchClient.search({
            filter: "ProductCode eq " + query.productCodes.join(" or ProductCode eq ")
          });
        } else {
          if (!query.filter && !query.query) {
            throw unparseableSyndicateQueriesError("The query " + JSON.stringify(query) + " could not be parsed. At least a productCodes, filter, or search parameter is required.");
          }
          return searchClient.search(query);
        }
      });

      Promise.all(apiCalls)
        .then(function(apiResponses) {
          finishResponse(apiResponses.reduce(function(payload, res, i) {
            payload[syndicateQueries[i].id] = res;
            return payload;
          }, {}));
        })
        .catch(callback);
    }
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
    //context.response.set('Content-Type', v + '; charset=utf-8');
  }

  function setBody(text) {
    context.response.body = text;
    return context.response.end();
  }

};

},{"mozu-node-sdk/clients/commerce/catalog/storefront/product":4,"mozu-node-sdk/clients/commerce/catalog/storefront/productSearchResult":5,"path":undefined,"querystring":undefined,"url":undefined}],2:[function(require,module,exports){
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
},{"./constants":10,"./plugins/in-memory-auth-cache":19,"./utils/get-config":23,"./utils/make-method":24,"./utils/normalize-context":26,"./utils/sub":32,"./utils/tiny-extend":33}],4:[function(require,module,exports){


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

},{"./version":35}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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
},{"../lib/Promise":13,"../lib/decorators/unhandledRejection":15}],13:[function(require,module,exports){
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

},{"./Scheduler":14,"./env":16,"./makePromise":18}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"../env":16,"../format":17}],16:[function(require,module,exports){
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
},{"_process":undefined}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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
},{"_process":undefined}],19:[function(require,module,exports){
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
},{"_process":undefined,"assert":undefined}],20:[function(require,module,exports){
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

},{"../clients/platform/adminuser/tenantAdminUserAuthTicket":6,"../clients/platform/applications/authTicket":7,"../clients/platform/developer/developerAdminUserAuthTicket":8,"../constants":10,"./auth-ticket":21,"when/es6-shim/Promise.browserify-es6":12}],21:[function(require,module,exports){

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
},{}],22:[function(require,module,exports){
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
},{"./tiny-extend":33,"buffer":undefined,"util":undefined}],23:[function(require,module,exports){
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
},{"./tiny-findup":34,"_process":undefined,"fs":undefined}],24:[function(require,module,exports){
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
},{"./make-url":25,"./prerequisite-manager":28,"./promise-pipeline":29,"./request":30,"./tiny-extend":33,"_process":undefined}],25:[function(require,module,exports){
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

},{"./tiny-extend":33,"uritemplate":11}],26:[function(require,module,exports){
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
},{"./tiny-extend":33}],27:[function(require,module,exports){
'use strict';
var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
module.exports = function parseDate(key, value) {
  return (typeof value === 'string' && reISO.exec(value)) ? new Date(value) : value;
};

},{}],28:[function(require,module,exports){
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
},{"../clients/platform/tenant":9,"../constants":10,"../security/auth-provider":20}],29:[function(require,module,exports){
/* global Promise */
require('when/es6-shim/Promise.browserify-es6');


module.exports = function promisePipeline(tasks) {
  return tasks.reduce(function(p, task) {
    return p.then(task);
  }, Promise.resolve());
};
},{"when/es6-shim/Promise.browserify-es6":12}],30:[function(require,module,exports){
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
},{"../constants":10,"./errorify":22,"./parse-json-dates":27,"./stream-to-callback":31,"./tiny-extend":33,"_process":undefined,"buffer":undefined,"http":undefined,"https":undefined,"path":undefined,"url":undefined,"when/es6-shim/Promise.browserify-es6":12}],31:[function(require,module,exports){
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
},{}],32:[function(require,module,exports){
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
},{"./tiny-extend":33,"util":undefined}],33:[function(require,module,exports){
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
},{}],34:[function(require,module,exports){
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
},{"_process":undefined,"fs":undefined,"path":undefined}],35:[function(require,module,exports){
module.exports = {
  current: "1.18.15231.5"
};
},{}]},{},[2])(2)
});