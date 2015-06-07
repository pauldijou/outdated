// A (package) manager is something like NPM or Bower
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./utils');
var Dependency = require('./dependency');

// constructor:
// name[String]
// dependencies[Array[Promise]]: an array of promises which each return a hash of "package name -> version"
// latest[String -> Promise]: take the package name, return Promise[Dependency constructor]
// local[Context, String -> Promise]: take the package name, return Promise[Dependency constructor]
// prune[() -> Promise]: remove all unused local packages
// update[() -> Promise]: update all local packages to their best version
// jsonUpdate[(Context, packages) -> Promise]: update all JSON files to the latest version
function Manager(opts) {
  this.name = opts.name;
  this.dependencies = opts.dependencies;
  this.prune = opts.prune.bind(this);
  this.update = opts.update.bind(this);

  this.fn = {
    latest: opts.latest.bind(this),
    local: opts.local.bind(this),
    jsonUpdate: opts.jsonUpdate.bind(this)
  };
}

Manager.prototype.skipOrLatest = function (current, name) {
  if (Dependency.skip(current)) {
    return Promise.resolve({name: name, skipped: true});
  } else {
    return this.fn.latest(name);
  }
}

Manager.prototype.latest = function (packages) {
  return Promise.all(_.map(packages, this.skipOrLatest.bind(this)));
};

Manager.prototype.local = function (context, packages) {
  return Promise.all(Object.keys(packages).map(function (name) {
    return this.fn.local(context, name).catch(function (err) {
      // No file means no local version
      if (err.code === 'ENOENT' || _.startsWith(err.message, 'ENOENT')) {
        return {name: name, local: undefined};
      } else {
        throw err;
      }
    });
  }.bind(this)));
};

Manager.prototype.normalize = function (context, packages) {
  return !utils.hasDependencies(packages) ? Promise.resolve([]) : Promise.all([
    this.latest(packages),
    this.local(context, packages)
  ]).then(function (res) {
    return Dependency.normalize(packages, res[0], res[1]);
  });
}

Manager.prototype.allDependencies = function (context) {
  return Promise.all(this.dependencies(context)).then(function (results) {
    return _.merge.apply(null, results);
  });
};

Manager.prototype.check = function (context) {
  return utils.safePromise(this.allDependencies(context).then(function (packages) {
    return this.normalize(context, packages);
  }.bind(this)));
};

Manager.prototype.jsonUpdate = function (packages) {
  return this.fn.jsonUpdate(packages).then(this.update);
};

module.exports = Manager;
