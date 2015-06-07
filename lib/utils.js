var path = require('path');
var logSymbols = require('log-symbols');

// Test if there are at least one dependency inside the package hash
module.exports.hasDependencies = function (packages) {
  return Object.keys(packages).length > 0;
}

// Wrap a Promise so it cannot fail anymore. The wrapper has the following keys:
// - ok[Boolean]: indicate if the promise should succeed or not
// - value[Object]: the result of the promise
module.exports.safePromise = function (promise) {
  return promise.then(function (result) {
    return {ok: true, value: result};
  }).catch(function (error) {
    return {ok: false, value: error};
  });
}

var dirRegexp = new RegExp(path.join(__dirname, '..'), 'g');

module.exports.log = {
  info: function (namespace) {
    return function (message) {
      console.log(' ' + logSymbols.info + ' [' + namespace + '] ' + message);
    };
  },
  stack: function (err) {
    console.log(err && err.stack.replace(dirRegexp, '') || err);
  }
};
