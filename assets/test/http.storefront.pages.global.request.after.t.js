/**
 * This is a scaffold for unit tests for the custom function for
 * `http.storefront.pages.global.request.after`.
 * Modify the test conditions below. You may:
 *  - add special assertions for code actions from Simulator.assert
 *  - create a mock context with Simulator.context() and modify it
 *  - use and modify mock Mozu business objects from Simulator.fixtures
 *  - use Express to simulate request/response pairs
 */

'use strict';

var Simulator = require('mozu-action-simulator');
var assert = Simulator.assert;

var pgrAfter = 'http.storefront.pages.global.request.after';

var libContents = require('fs').readFileSync('./assets/src/syndicator-built.js', 'utf8');

var testTenantConfig = require('../../mozu.test.config.json');

console.log("testing with config", testTenantConfig);

assert(testTenantConfig.tenantId, "Need tenant ID in mozu.test.config.json to run tests");
assert(testTenantConfig.siteId, "Need site ID in mozu.test.config.json to run tests");
assert(testTenantConfig.catalogId, "Need catalog ID in mozu.test.config.json to run tests");
assert(testTenantConfig.exampleProductCode, "Need exampleProductCode in mozu.test.config.json to run tests");
assert(testTenantConfig.exampleCategoryId, "Need exampleCategoryId in mozu.test.config.json to run tests");
assert(testTenantConfig.exampleSearchTerm, "Need exampleSearchTerm in mozu.test.config.json to run tests");

function addTestTenantConfig(ctx) {
  ctx.apiContext = testTenantConfig;
  return ctx;
}

describe(pgrAfter, function () {

  var action;

  before(function () {
    action = require('../src/domains/storefront/http.storefront.pages.global.request.after');
  });

  it('does nothing if there is no syndicator or syndicate in the url', function(done) {
    var callback = function(err) {
      assert.ok(!err, "Callback was called with an error: " + err);
      done();
    };
    var context = addTestTenantConfig(Simulator.context(pgrAfter, callback));
    context.request.url = "/";
    Simulator.simulate(pgrAfter, action, context, callback);
  });

  it('returns the javascript library when any storefront route is called with "?syndicator"', function(done) {

    var headerWasSetTo = '';

    var callback = function(err) {
      assert.ok(!err, "Callback was called with an error: " + err);

      assert.equal(context.response.body, libContents);

      //assert.equal(headerWasSetTo, "text/javascript; charset=utf-8");

      // more assertions
      done();
    };

    var context = addTestTenantConfig(Simulator.context(pgrAfter, callback));
    context.request.url = "/?syndicator";
    context.response.set = function(k,v) {
      if (k === "Content-Type") headerWasSetTo = v;
    };

    Simulator.simulate(pgrAfter, action, context, callback);
  });

  describe('returns an error is any storefront route is called with ?syndicate but', function() {

    it('no value was provided', function(done) {

      var callback = function(err) {
        assert(err, "Callback was called without error!");
        assert.equal(err.code, "NOTHING_TO_SYNDICATE");
        done();
      }

      var context = addTestTenantConfig(Simulator.context(pgrAfter, callback));

      context.request.url = "/?syndicate";

      Simulator.simulate(pgrAfter, action, context, callback);
    });


    it('the value is not valid json', function(done) {

      var callback = function(err) {
        assert(err, "Callback was called without error!");
        assert.equal(err.code, "COULD_NOT_PARSE_SYNDICATE_QUERIES");
        done();
      }

      var context = addTestTenantConfig(Simulator.context(pgrAfter, callback));

      context.request.url = "/?syndicate={bad json}{}OP;"

      Simulator.simulate(pgrAfter, action, context, callback);

    });

    it('the value is not a json array', function(done) {

      var callback = function(err) {
        assert(err, "Callback was called without error!");
        assert.equal(err.code, "COULD_NOT_PARSE_SYNDICATE_QUERIES");
        done();
      }

      var context = addTestTenantConfig(Simulator.context(pgrAfter, callback));

      context.request.url = "/?syndicate=" + encodeURIComponent(JSON.stringify({ no: 'dice'}));

      Simulator.simulate(pgrAfter, action, context, callback);

    });


    it('the value is an empty array', function(done) {

      var callback = function(err) {
        assert(err, "Callback was called without error!");
        assert.equal(err.code, "NOTHING_TO_SYNDICATE");
        done();
      }

      var context = addTestTenantConfig(Simulator.context(pgrAfter, callback));

      context.request.url = "/?syndicate=" + encodeURIComponent('[]');

      Simulator.simulate(pgrAfter, action, context, callback);

    });

  });

  it("replies to a request for a single product with json", function(done) {

    var context;

    var callback = function(err) {
      assert(!err, "Callback was called with an error! " + err);
      assert(context.response.body, "no body");
      assert(context.response.body.products, "no products in response body");
      assert.equal(context.response.body.products.items[0].productCode, testTenantConfig.exampleProductCode);
      done();
    }

    context = addTestTenantConfig(Simulator.context(pgrAfter, callback));
    context.request.url = "/?syndicate=" + encodeURIComponent(JSON.stringify([
      {
        id: "products",
        productCodes: [testTenantConfig.exampleProductCode] 
      }
    ]));

    Simulator.simulate(pgrAfter, action, context, callback);

  });

  it("replies to a request for a complex search with that search result", function(done) {

    var context;

    this.timeout(10000);

    var callback = function(err) {
      assert(!err, "Callback was called with an error! " + err);
      assert(context.response.body, "no body");
      var searchResult = context.response.body.search1;
      assert(searchResult, "no search1 in response body");
      assert(searchResult.items, "no items in search response");
      assert(searchResult.hasOwnProperty('totalCount'), "no totalcount in search response")
      assert(searchResult.items.every(function(item) {
        return item.categories.some(function(cat) {
          return cat.categoryId === testTenantConfig.exampleCategoryId;
        });
      }), "the returned products do not match the query, they do not belong to category 1");
      done();
    }

    context = addTestTenantConfig(Simulator.context(pgrAfter, callback));
    context.request.url = "/?syndicate=" + encodeURIComponent(JSON.stringify([
      {
        id: "search1",
        filter: "categoryId req " + testTenantConfig.exampleCategoryId
      }
    ]));

    Simulator.simulate(pgrAfter, action, context, callback);

  });
  
  
  it("replies to a request for a multiple searches with the results of each search", function(done) {

    var context;

    this.timeout(10000);

    var callback = function(err) {
      assert(!err, "Callback was called with an error! " + err);
      assert(context.response.body, "no body");
      var searchResult = context.response.body.search1;
      assert(searchResult, "no search1 in response body");
      assert(searchResult.items, "no items in search response");
      assert(searchResult.items.every(function(item) {
        return item.categories.some(function(cat) {
          return cat.categoryId === testTenantConfig.exampleCategoryId;
        });
      }), "the returned products do not match the query, they do not belong to category 1");
      var fuzzyResult = context.response.body.search2;
      assert(fuzzyResult, "no search2");
      assert(fuzzyResult.items, "no items in search2");
      assert(fuzzyResult.items[0].content.productName.toLowerCase().indexOf(testTenantConfig.exampleSearchTerm) !== -1, "First search result didn't seem to match " + testTenantConfig.exampleSearchTerm);

      done();
    }

    context = addTestTenantConfig(Simulator.context(pgrAfter, callback));
    context.request.url = "/?syndicate=" + encodeURIComponent(JSON.stringify([
      {
        id: "search1",
        filter: "categoryId req " + testTenantConfig.exampleCategoryId
      },
      {
        id: "search2",
        query: testTenantConfig.exampleSearchTerm
      }
    ]));

    Simulator.simulate(pgrAfter, action, context, callback);

  });
});
