Airbrake.prototype.log = function logger(str) {
  if (this.consoleLogError) {
    console.error(str);
  }
};
