
var onError = function errorHandler(err, die) {
  var self = this;
  var error = err;
  if (!(error instanceof Error)) {
    error = new Error(err);
  }
  self.log('Airbrake: Uncaught exception, sending notification for:');
  self.log(err.stack || err);

  self.notify(err, function notifier(notifyErr, url, devMode) {
    if (notifyErr) {
      self.log('Airbrake: Could not notify service.');
      self.log(notifyErr.stack);
    } else if (devMode) {
      self.log('Airbrake: Dev mode, did not send.');
    } else {
      self.log('Airbrake: Notified service: ' + url);
    }

    if (die) {
      process.exit(1);
    }
  });
};

var handleExceptions = function exceptionHandler(die) {
  var shouldDie = (typeof die === 'undefined') ? true : die;

  process.on('uncaughtException', function errorHandler(err) {
    onError(err, shouldDie);
  });
};

module.exports = onError;
