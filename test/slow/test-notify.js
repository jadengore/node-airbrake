var common = require('../common');
var airbrake = require(common.dir.root).createClient(null, common.key, 'production');
var sinon = require('sinon');
var assert = require('assert');

var err = new Error('Node.js just totally exploded on me');
err.env = { protect: 'the environment!' };
err.session = { iKnow: 'what you did last minute' };
err.url = 'http://example.org/bad-url';

var circular = {};
circular.circular = circular;

err.params = { some: 'params', circular: circular };

airbrake.on('vars', function (type, vars) {
  /* eslint no-param-reassign: 0 */
  delete vars.SECRET;
});

var spy = sinon.spy();
airbrake.notify(err, spy);

process.on('exit', function () {
  assert.ok(spy.called);

  var error = spy.args[0][0];
  if (error) {
    throw error;
  }

  var url = spy.args[0][1];
  assert.ok(/^https?:\/\//.test(url));
});
