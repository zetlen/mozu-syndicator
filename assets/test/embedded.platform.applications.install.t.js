/**
 * This is a scaffold for unit tests for the custom function for
 * `embedded.platform.applications.install`.
 * Modify the test conditions below. You may:
 *  - add special assertions for code actions from Simulator.assert
 *  - create a mock context with Simulator.context() and modify it
 *  - use and modify mock Mozu business objects from Simulator.fixtures
 */

'use strict';

var Simulator = require('mozu-action-simulator');
var assert = Simulator.assert;

xdescribe('embedded.platform.applications.install', function () {

  var action;

  before(function () {
    action = require('../src/domains/platform.applications/embedded.platform.applications.install');
  });

  it('runs successfully', function(done) {

    var callback = function(err) {
      assert.ok(!err, "Callback was called with an error: " + err);
      // more assertions
      done();
    };

    var context = Simulator.context('embedded.platform.applications.install', callback);

    // modify context as necessary


    Simulator.simulate('embedded.platform.applications.install', action, context, callback);
  });
});
