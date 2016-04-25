var HTTP_STATUS_CODES = require('http').STATUS_CODES;
var _ = require('lodash');
var request = require('request');
var stackTrace = require('stack-trace');
var fs = require('fs');
var os = require('os');
var url = require('url');
var stringify = require('json-stringify-safe');

var logger = require('../log');

var PACKAGE = (function () {
  var json = fs.readFileSync(__dirname + '/../package.json', 'utf8');
  return JSON.parse(json);
}());

var contextJSON = function (err) {
  var context = {};
  context.notifier = {
    name: PACKAGE.name,
    version: PACKAGE.version,
    url: PACKAGE.homepage
  };
  context.environment = this.env;
  context.rootDirectory = this.projectRoot;
  context.os = os.type();
  context.hostname = os.hostname();
  context.url = url.resolve(this.host, err.url || '');
  return context;
};

var environmentJSON = function (err) {
  var cgiData = {};
  var self = this;

  if (this.whiteListKeys.length > 0) {
    Object.keys(process.env).forEach(function (key) {
      if (self.whiteListKeys.indexOf(key) > -1) {
        cgiData[key] = process.env[key];
      } else {
        cgiData[key] = '[FILTERED]';
      }
    });
  } else if (this.blackListKeys.length > 0) {
    Object.keys(process.env).forEach(function (key) {
      if (self.blackListKeys.indexOf(key) > -1) {
        cgiData[key] = '[FILTERED]';
      } else {
        cgiData[key] = process.env[key];
      }
    });
  }

  if (err.ua) {
    cgiData.HTTP_USER_AGENT = err.ua;
  }

  Object.keys(err).forEach(function (key) {
    if (self.exclude.indexOf(key) >= 0) {
      return;
    }

    cgiData['err.' + key] = err[key];
  });

  cgiData['process.pid'] = process.pid;

  if (os.platform() !== 'win32') {
    // this two properties are *NIX only
    cgiData['process.uid'] = process.getuid();
    cgiData['process.gid'] = process.getgid();
  }

  cgiData['process.cwd'] = process.cwd();
  cgiData['process.execPath'] = process.execPath;
  cgiData['process.version'] = process.version;
  cgiData['process.argv'] = process.argv;
  cgiData['process.memoryUsage'] = process.memoryUsage();
  cgiData['os.loadavg'] = os.loadavg();
  cgiData['os.uptime'] = os.uptime();

  return cgiData;
};

var notifyJSON = function (err) {
  var trace = stackTrace.parse(err);
  return stringify({
    errors: [
      {
        type: err.type || 'Error',
        message: err.message,
        backtrace: trace.map(function (callSite) {
          return {
            file: callSite.getFileName() || '',
            line: callSite.getLineNumber(),
            function: callSite.getFunctionName() || ''
          };
        })
      }],
    environment: environmentJSON(err),
    context: contextJSON(err),
    session: (typeof err.session === 'object') ? err.session : {},
    params: (typeof err.params === 'object') ? err.params : {}
  });
};

var Notify = function (options) {
  var sendRequest = function (err, cb) {
    var callback = this.callback(cb);

    var body = notifyJSON(err);

    var requestOptions = _.merge({
      method: 'POST',
      url: this.url('/api/v3/projects/' + this.projectId + '/notices?key=' + this.key),
      body: body,
      timeout: options.timeout,
      headers: {
        'Content-Length': body.length,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }, options.requestOptions);

    request(requestOptions, function (requestErr, res, responseBody) {
      if (requestErr) {
        return callback(requestErr);
      }

      if (undefined === responseBody) {
        return callback(new Error('invalid body'));
      }

      if (res.statusCode >= 300) {
        var status = HTTP_STATUS_CODES[res.statusCode];

        var explanation = responseBody.match(/<error>([^<]+)/i);
        explanation = (explanation)
          ? ': ' + explanation[1]
          : ': ' + responseBody;

        return callback(new Error(
          'Notification failed: ' + res.statusCode + ' ' + status + explanation
        ));
      }

      var responseUrl = JSON.parse(responseBody).url;
      return callback(null, responseUrl);
    });
  };

  return function (err, cb) {
    var callback = this.callback(cb);
    // log errors instead of posting to airbrake if a dev enviroment
    if (this.developmentEnvironments.indexOf(options.env) !== -1) {
      logger.log(err);
      return callback(null, null, true);
    }
    var exit = _.some(options.ignoredExceptions, function (ignoredError) {
      return err instanceof ignoredError;
    });

    if (exit) {
      return callback(null, null, false);
    }

    return sendRequest(err, callback);
  };
};

module.exports = Notify;
