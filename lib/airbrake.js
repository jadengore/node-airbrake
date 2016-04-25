
// var fs = require('fs');
// var os = require('os');
var EventEmitter = require('events').EventEmitter;
var request = require('request');
// var stackTrace = require('stack-trace');
var _ = require('lodash');
// var stringify = require('json-stringify-safe');
var execSync = require('sync-exec');
// var url = require('url');

var notify = function(options) {
  return function(err, cb) {
    var callback = this._callback(cb);
    var exit = false;
    // log errors instead of posting to airbrake if a dev enviroment
    if (this.developmentEnvironments.indexOf(this.env) != -1) {
      this.log(err);
      return callback(null, null, true);
    }
    this.ignoredExceptions.forEach(function(exception){
      if (err instanceof exception){
        exit = true;
      }
    })

    if (exit){
      return callback(null, null, false);
    }

    return this._sendRequest(err, callback);
  };
};

var exclude = [
  'type',
  'message',
  'arguments',
  'stack',
  'url',
  'session',
  'params',
  'component',
  'action',
  'domain',
  'domainEmitter',
  'domainBound',
  'ua'
];

var defaultOptions = {
  key: null,
  env: process.env.NODE_ENV || 'development',
  projectId: null,
  whiteListKeys: [],
  blackListKeys: [],
  timeout: 30 * 1000,
  developmentEnvironments: ['development', 'test'],
  consoleLogError: false,
  proxy: null,
  serviceHost: process.env.AIRBRAKE_SERVER || 'api.airbrake.io',
  requestOptions: {},
  ignoredExceptions: []
};


var callback = function(cb) {
  var self = this;
  return function(err) {
    if (cb) {
      cb.apply(self, arguments);
      return;
    }

    if (err) {
      self.emit('error', err);
    }
  };
};


var Airbrake = function (options) {
  var config = _.merge(defaultOptions, options);

  var airbrake = function () {};
  _.assign(airbrake, EventEmitter, callback, {
    expressHandler: expressHandler(config),
    notify: notify(config),
    trackDeployment: trackDeployment(config)
  });

  return airbrake;
};

module.exports = Airbrake;
