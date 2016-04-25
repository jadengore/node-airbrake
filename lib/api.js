var sendRequest = function(err, cb) {
  var callback = this._callback(cb);

  var body = this.notifyJSON(err);

  var options = _.merge({
    method: 'POST',
    url: this.url('/api/v3/projects/' + this.projectId + '/notices?key=' + this.key),
    body: body,
    timeout: this.timeout,
    headers: {
      'Content-Length': body.length,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  }, this.requestOptions);

  request(options, function(err, res, body) {
    if (err) {
      return callback(err);
    }

    if (undefined === body) {
      return callback(new Error('invalid body'));
    }

    if (res.statusCode >= 300) {
      var status = HTTP_STATUS_CODES[res.statusCode];

      var explanation = body.match(/<error>([^<]+)/i);
      explanation = (explanation)
        ? ': ' + explanation[1]
        : ': ' + body;

      return callback(new Error(
        'Notification failed: ' + res.statusCode + ' ' + status + explanation
      ));
    }

    var url = JSON.parse(body).url;
    callback(null, url);
  });
}

Airbrake.prototype.notify = function(err, cb) {
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

Airbrake.prototype.url = function(path) {
  return this.protocol + '://' + this.serviceHost + path;
};
