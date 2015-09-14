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
var fs = require('fs');
var path = require('path');
var url = require('url');
var querystring = require('querystring');

var productClientFactory = require('mozu-node-sdk/clients/commerce/catalog/storefront/product');
var searchClientFactory = require('mozu-node-sdk/clients/commerce/catalog/storefront/productSearchResult');

var syndicatorLibContents = fs.readFileSync(path.join(__dirname, '../../syndicator-built.js'), 'utf8');

module.exports = function(context, callback) {

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
    //context.response.set('Content-Type', v + '; charset=utf-8');
  }

  function setBody(text) {
    context.response.body = text;
    return context.response.end();
  }

};
