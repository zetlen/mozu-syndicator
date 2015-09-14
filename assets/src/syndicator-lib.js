var Hypr = require('hypr-storefront');
var domready = require('domready');

function renderAll(resolved) {
  for (var k in resolved) {
    if (resolved.hasOwnProperty(k)) {
      (function(template, results) {
        var output = Hypr.engine.render(template.textContent || template.innerText, { locals: { model: results }});
        var container = document.createElement('span');
        container.innerHTML = output;
        template.parentNode.insertBefore(cont, template);
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
          query: script.getAttribute('data-mozu-product-query');
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
            filter: filter,
            query: query
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

domready(function() {
  var scripts = document.getElementsByTagName('script');

  var processed = processScripts(scripts);
  var queries = processed.queries;
  var productCodeDispatch = processes.productCodeDispatch;
  var templates = process.templates;

  getQueries(queries, function(error, results) {
    if (error) throw error;
    var resolved = [];

  });


})
