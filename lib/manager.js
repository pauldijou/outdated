// A (package) manager is something like NPM or Bower
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('graceful-fs'));
var _ = require('lodash');
var chalk = require('chalk');
var git = require('./git');
var utils = require('./utils');
var Dependency = require('./dependency');
var context = require('./context');

function wrap(name, that, fun) {
  function wrapped() {
    context.verbose(1, chalk[that.color](that.name) + ' ' + name + ' start');
    return fun.apply(that, arguments).then(function (result) {
      context.verbose(1, chalk[that.color](that.name) + ' ' + name + ' done');
      return result;
    }, function (err) {
      context.verbose(1, chalk[that.color](that.name) + ' ' + name + ' failed');
      throw err;
    })
  };

  wrapped.bind(that);

  return wrapped;
}

// constructor:
// name[String]
// dependencies[Promise[Array[Dependency]]]
// latest[String -> Promise]: take the package name, return Promise[version: Number]
// prune[() -> Promise]: remove all unused local packages
// update[() -> Promise]: update all local packages to their best version
// jsonFile[() -> Promise[{filename, content}]]: return the path and the content of the JSON file of this manager
function Manager(opts) {
  this.name = opts.name;
  this.color = opts.color;
  this.dependencies = opts.dependencies.bind(this);
  this.utils = opts.utils;
  this.prune = wrap('prune', this, opts.prune);
  this.update = wrap('update', this, opts.update);
  this.jsonFile = wrap('jsonFile', this, opts.jsonFile);

  this.fn = {
    latest: opts.latest.bind(this),
    jsonUpdate: opts.jsonUpdate && wrap('jsonUpdate', this, opts.jsonUpdate)
  };

  if (!this.jsonFile) {
    throw new Error('Need a jsonFile function');
  } else {
    this.fn.jsonUpdate = wrap('jsonUpdate', this, function (context, dependencies) {
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
    });
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

Manager.prototype.jsonData = function (context) {
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

Manager.prototype.jsonUpdate = function (dependencies) {
  return this.fn.jsonUpdate(context, dependencies).then(this.update);
};

module.exports = Manager;
