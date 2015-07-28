var _ = require('lodash');
var utils = require('./utils');

function Context() {
  this.logger = undefined;
  this.options = {};
  this.managers = {};
  this.dependencies = {};
  this.answers = {};
  this.actions = {};
  this.ok = {};
}

Context.prototype.setOptions = function (opts, defaults) {
  this.options = _.merge({}, defaults || {}, opts || {});
  this.logger = new utils.Logger(this.options);
};

Context.prototype.directory = function () {
  return '.';
};

Context.prototype.log = function (message) {
  this.logger.log(message);
};

Context.prototype.verbose = function (verbosity, message) {
  this.logger.verbose(verbosity, message);
};

Context.prototype.info = function (message) {
  this.logger.info(message);
};

Context.prototype.stack = function (message) {
  this.logger.stack(message);
};

Context.prototype.setDependencies = function (packageManager, dependencies) {
  this.dependencies[packageManager] = dependencies;
};

Context.prototype.addAnswers = function (packageManager, answers) {
  this.answers[packageManager] = answers;
};

module.exports = new Context();
