var sessionVars = function(err) {
  return (typeof err.session  === 'object')
    ? err.session
    : {};
};

var paramsVars = function(err) {
  return (typeof err.params === 'object')
    ? err.params
    : {};
};
