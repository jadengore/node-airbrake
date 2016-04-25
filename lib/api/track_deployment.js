var HTTP_STATUS_CODES = require('http').STATUS_CODES;
var _ = require('lodash');
var execSync = require('sync-exec');
var request = require('request');

var url = function (options) {
  return function (path) {
    return options.protocol + '://' + options.serviceHost + path;
  };
};

var deploymentPostData = function (params) {
  return JSON.stringify({
    version: 'v2.0',
    environment: params.env,
    username: params.user,
    revision: params.rev,
    repository: params.repo
  });
};

var TrackDeployment = function (options) {
  return function (params, cb) {
    var deployParams = params || {};
    var callback = this.callback(cb);

    if (typeof deployParams === 'function') {
      callback = params;
      deployParams = {};
    }

    var deploymentPostDataParams = _.merge({
      key: options.key,
      env: options.env,
      user: process.env.USER,
      rev: execSync('git rev-parse HEAD').stdout.toString().slice(0, -1),
      repo: execSync('git config --get remote.origin.url').stdout.toString().slice(0, -1)
    }, deployParams);

    var body = deploymentPostData(deploymentPostDataParams);

    var deployRequestOptions = _.merge({
      method: 'POST',
      url: url('/api/v4/projects/' + this.projectId + '/deploys?key=' + this.key),
      body: body,
      timeout: this.timeout,
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/json'
      },
      proxy: this.proxy
    }, this.requestOptions);

    request(deployRequestOptions, function (err, res, responseBody) {
      if (err) {
        return callback(err);
      }

      if (res.statusCode >= 300) {
        var status = HTTP_STATUS_CODES[res.statusCode];
        return callback(new Error(
          'Deployment failed: ' + res.statusCode + ' ' + status + ': ' + responseBody
        ));
      }

      return callback(null, params);
    });
  };
};

module.exports = TrackDeployment;
