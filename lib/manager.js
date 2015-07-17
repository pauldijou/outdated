// A (package) manager is something like NPM or Bower
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('graceful-fs'));
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
// jsonFile[() -> Promise[{filename, content}]]: return the path and the content of the JSON file of this manager
function Manager(opts) {
  this.name = opts.name;
  this.dependencies = opts.dependencies.bind(this);
  this.prune = opts.prune.bind(this);
  this.update = opts.update.bind(this);
  this.jsonFile = opts.jsonFile.bind(this);
  this.utils = opts.utils;

  this.fn = {
    latest: opts.latest.bind(this),
    jsonUpdate: opts.jsonUpdate && opts.jsonUpdate.bind(this)
  };

  if (!this.jsonFile) {
    throw new Error('Need a jsonFile function');
  } else {
    this.fn.jsonUpdate = function (context, dependencies) {
      return this.jsonFile().then(function (file) {
        dependencies.forEach(function (dep) {
          var find = '"' + utils.escapeRegExp(dep.name) + '"\\s*:\\s*"' + utils.escapeRegExp(dep.dependency) + '"';
          var updateTo = dep.dependency.replace(dep.current, dep.updateTo());
          var replaceWith = '"' + dep.name + '": "' + updateTo + '"';
          var regex = new RegExp(find, 'g');
          file.content = file.content.replace(regex, replaceWith);
        });

        return file;
      }).then(function (file) {
        return fs.writeFileAsync(file.filename, file.content, {encoding: 'utf8'});
      }).then(function () {
        return context;
      });
    }.bind(this)
  }
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
    return this.fn.latest(dependency);
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

Manager.prototype.jsonData = function () {
  return this.jsonFile().then(function (file) {
    return require(file.filename);
  }, function (err) {
    if (err && err.code === 'ENOENT') {
      // No file, no data
      return {};
    } else {
      throw err;
    }
  });
};

Manager.prototype.check = function () {
  return this.dependencies()
    .then(analyze.bind(this))
    .then(latest.bind(this))
    .then(setup.bind(this));
};

Manager.prototype.jsonUpdate = function (context, dependencies) {
  return this.fn.jsonUpdate(context, dependencies).then(this.update);
};

module.exports = Manager;
