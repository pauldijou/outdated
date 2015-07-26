var path = require('path');
var chalk = require('chalk');
var _ = require('lodash');
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
};

module.exports.current = function (data, name) {
  return data.dependencies && data.dependencies[name]
    || data.devDependencies && data.devDependencies[name]
    || data.optionalDependencies && data.optionalDependencies[name]
    || data.peerDependencies && data.peerDependencies[name]
    || undefined;
};

module.exports.escapeRegExp = function (str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

module.exports.ifEnoent = function (err, cb) {
  if (err.code === 'ENOENT' || _.startsWith(err.message, 'ENOENT')) {
    return cb();
  } else {
    throw err;
  }
};

var dirRegexp = new RegExp(path.join(__dirname, '..'), 'g');

function Logger(options) {
  this.options = options || {};
  if (!this.options.verbose) {
    this.options.verbose = 0;
  }
}

Logger.prototype.log = function (message) {
  if (!this.options.silent) {
    console.log(message);
  }
};

Logger.prototype.verbose = function (verbosity, message) {
  if (verbosity <= this.options.verbose) {
    this.log(chalk.cyan('[TRACE] ') + message);
  }
};

Logger.prototype.info = function (message) {
  this.log(' ' + logSymbols.info + ' ' + message);
};

Logger.prototype.stack = function (err) {
  if (err && err.code != undefined) {
    this.log('Code: ' + err.code);
  }
  if (err && err.stack) {
    this.log(err.stack.replace(dirRegexp, ''));
  } else if (err) {
    this.log(err);
  }
};

module.exports.Logger = Logger;
