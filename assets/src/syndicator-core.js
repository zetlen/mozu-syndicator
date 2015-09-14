/* jshint loopfunc:true */
var Hypr = require('hypr');
var domready = require('domready');

var hyprMan = new Hypr.Manager({});

function renderAll(resolved) {
  for (var k in resolved) {
    if (resolved.hasOwnProperty(k)) {
      (function(template, results) {
        var output = hyprMan.evaluate(template.textContent || template.innerText, { model: results });
        var container = document.createElement('span');
        container.innerHTML = output;
        template.parentNode.insertBefore(container, template);
      }(resolved[k].template, resolved[k].results));
    }
  }
}

var ids = 0;
function createId() {
  return "__mozu_syndicated_template" + ids++;
}

function processScripts(scripts) {
  
  var queries = [];
  var productQuery = {
    id: 'products',
    productCodes: []
  };
  var productCodeDispatch = {};
  var templates = {};

  for (var i = 0; i < scripts.length; i++) {
    (function(script) {
      var dataAttributes = {};
      var id = createId();
      if (script.getAttribute('type') === "text/mozu-syndicated") {

        script.setAttribute('id', id);
        templates[id] = script;

        dataAttributes = {
          productCode: script.getAttribute('data-mozu-product-code'),
          productCodes: script.getAttribute('data-mozu-product-codes'),
          filter: script.getAttribute('data-mozu-product-filter'),
          query: script.getAttribute('data-mozu-product-query')
        };

        if (dataAttributes.productCode) {
          productCodeDispatch[id] = dataAttributes.productCode;
          productQuery.productCodes.push(dataAttributes.productCode);
        } else if (dataAttributes.productCodes) {
          productCodeDispatch[id] = dataAttributes.productCodes;
          productQuery.productCodes = productQuery.productCodes.concat(dataAttributes.productCodes.split(','));
        } else {
          queries.push({
            id: id,
            filter: dataAttributes.filter,
            query: dataAttributes.query
          });
        }
      }  
    }(scripts[i]));
  }
  if (productQuery.productCodes.length > 0) {
    queries.push(productQuery);
  }
  return {
    queries: queries,
    productCodeDispatch: productCodeDispatch,
    templates: templates
  };
}

function getQueries(queries, cb) {
  var url = MozuSyndicatedStore;
  if (url.lastIndexOf('/') !== url.length-1) url += "/";
  var callbackName = "__mozu_syndicator_callback" + (new Date()).getTime();
  window[callbackName] = cb;
  url += "?callback=" + callbackName;
  url += "&syndicate=";
  url += encodeURIComponent(JSON.stringify(queries));
  var s = document.createElement('script');
  s.src = url;
  s.async = 1;
  document.head.appendChild(s);
}

domready(function() {


  if (!window.MozuSyndicatedStore) {
    throw new Error("Global MozuSyndicatedStore variable missing.");
  }

  var scripts = document.getElementsByTagName('script');

  var processed = processScripts(scripts);
  var queries = processed.queries;
  var productCodeDispatch = processed.productCodeDispatch;
  var templates = processed.templates;

  getQueries(queries, function(results) {
    var resolved = [];
    if (results.products) {
      for (var d in productCodeDispatch) {
        if (productCodeDispatch.hasOwnProperty(d)) {
          if (typeof productCodeDispatch[d] === "string") {
            resolved[d] = {
              template: templates[d],
              results: (function(prods) {
                for (var j = 0; j < prods.length; j++) {
                  if (prods[j].productCode === productCodeDispatch[d]) {
                    return prods[j];
                  }
                }
              }(results.products.items))
            };
          } else {
            resolved[d] = {
              template: templates[d],
              results: {
                items: (function(prods, codes) {
                  var out = [];
                  for (var j = 0; j < prods.length; j++) {
                    for (var ii = 0;  ii < codes.length; ii++) {
                      if (codes[ii] === prods[j].productCode) {
                        out.push(prods[j]);
                        break;
                      }
                    }
                  }
                  return out;
                }(results.products.items, productCodeDispatch[d]))
              }
            };
          }
        }
      } 
    } 
    delete results.products;
    for (var resId in results) {
      if (results.hasOwnProperty(resId)) {
        resolved[resId] = {
          template: templates[resId],
          results: results[resId]
        };
      }
    }
    renderAll(resolved);
  });

});
