Airbrake.prototype._callback = function(cb) {
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
