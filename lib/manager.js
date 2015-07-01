// A (package) manager is something like NPM or Bower
var Promise = require('bluebird');
var fs = require('graceful-fs');
var _ = require('lodash');
var git = require('./git');
var utils = require('./utils');
var Dependency = require('./dependency');

// constructor:
// name[String]
// dependencies[Promise[Array[Dependency]]]
// latest[String -> Promise]: take the package name, return Promise[version: Number]
// prune[() -> Promise]: remove all unused local packages
// update[() -> Promise]: update all local packages to their best version
// jsonUpdate[(Context, packages) -> Promise]: update all JSON files to the latest version
// One out of two:
function Manager(opts) {
  this.name = opts.name;
  this.dependencies = opts.dependencies.bind(this);
  this.prune = opts.prune.bind(this);
  this.update = opts.update.bind(this);

  this.fn = {
    latest: opts.latest.bind(this),
    jsonUpdate: opts.jsonUpdate.bind(this),

  };
}

function analyze(dependencies) {
  dependencies.forEach(function (dep) {
    dep.analyze();
  });
  return dependencies;
}

function skipOrLatest(dependency) {
  if (dependency.skipped) {
    return Promise.resolve({});
  } else if (dependency.git) {
    return git.latest(dependency.name, dependency.git);
  } else {
    return this.fn.latest(dependency.name);
  }
}

function latest(dependencies) {
  return Promise.all(dependencies.map(function (dep) {
    if (!dep.latest || !dep.versions) {
      return skipOrLatest.bind(this)(dep).then(function (infos) {
        _.merge(dep, infos);
        return dep;
      });
    } else {
      return Promise.resolve(dep);
    }
  }.bind(this)));
};

function setup(dependencies) {
  dependencies.forEach(function (dep) {
    dep.setup();
  });
  return dependencies;
};

Manager.prototype.check = function (context) {
  return this.dependencies()
    .then(analyze.bind(this))
    .then(latest.bind(this))
    .then(setup.bind(this));
};

Manager.prototype.jsonUpdate = function (packages) {
  return this.fn.jsonUpdate(packages).then(this.update);
};

module.exports = Manager;
