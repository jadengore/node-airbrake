var error = require('../error');

var ExpressHandler = function (options) {
  if (!options.disableUncaughtException) {
    process.on('uncaughtException', function (err) {
      error.onError(err, true);
    });
  }

  return function (err, req, res, next) {
    var response = res;
    var expressError = err;

    if (response.statusCode < 400) {
      response.statusCode = 500;
    }

    expressError.url = req.url;
    expressError.component = req.url;
    expressError.action = req.method;
    expressError.params = req.body;
    expressError.session = req.session;
    expressError.ua = req.get('User-Agent');

    error.onError(expressError, false);
    next(expressError);
  };
};

module.exports = ExpressHandler;
