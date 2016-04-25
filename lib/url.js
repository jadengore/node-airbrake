'use strict';

var url = function (options) {
  return function (path) {
    return options.protocol + '://' + options.serviceHost + path;
  };
};

module.exports = url;
