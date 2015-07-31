// A (package) manager is something like NPM or Bower
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('graceful-fs'));
var _ = require('lodash');
var chalk = require('chalk');
var git = require('./git');
var utils = require('./utils');
var Dependency = require('./dependency');
var context = require('./context');

function verbose(v, that, message) {
  context.verbose(1, chalk[that.color](that.name) + ' ' + message);
}

function wrap(name, that, fun) {
  function wrapped() {
    verbose(1, that, name + ' start');
    return fun.apply(that, arguments).then(function (result) {
      verbose(1, that, name + ' done');
      return result;
    }, function (err) {
      verbose(1, that, name + ' failed');
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
    this.fn.jsonUpdate = wrap('jsonUpdate', this, function (dependencies) {
      return this.jsonFile().then(function (file) {
        dependencies.forEach(function (dep) {
          var target = dep.updateTo();
          var find = '"' + utils.escapeRegExp(dep.name) + '"\\s*:\\s*"' + utils.escapeRegExp(dep.dependency) + '"';
          var updateTo = dep.dependency.replace(dep.current, target);
          var replaceWith = '"' + dep.name + '": "' + updateTo + '"';
          var regex = new RegExp(find, 'g');
          file.content = file.content.replace(regex, replaceWith);

          dep.updated = target;
        });

        return file;
      }).then(function (file) {
        return fs.writeFileAsync(file.filename, file.content, {encoding: 'utf8'});
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
    verbose(2, this, 'Dependency [' + dependency.name + '] skipped.');
    return Promise.resolve({});
  } else if (!dependency.current) {
    verbose(2, this, 'Dependency [' + dependency.name + '] does not have a current.');
    return Promise.resolve({});
  } else if (dependency.git) {
    verbose(2, this, 'Dependency [' + dependency.name + '] get latest git.');
    return git.latest(dependency.name, dependency.git);
  } else {
    verbose(2, this, 'Dependency [' + dependency.name + '] get latest.');
    return this.fn.latest(dependency);
  }
}

function latest(dependencies) {
  verbose(1, this, 'latest start');
  return Promise.all(dependencies.map(function (dep) {
    if (!dep.latest || !dep.versions) {
      return skipOrLatest.bind(this)(dep).then(function (infos) {
        _.merge(dep, infos);
        return dep;
      });
    } else {
      verbose(1, this, 'Dependency [' + dep.name + '] completed at once.');
      return Promise.resolve(dep);
    }
  }.bind(this))).then(function (res) {
    verbose(1, this, 'latest done');
    return res;
  }.bind(this), function (err) {
    verbose(1, this, 'latest failed');
    throw err;
  }.bind(this));
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

Manager.prototype.jsonUpdate = function (dependencies) {
  return this.fn.jsonUpdate(dependencies).then(this.update);
};

module.exports = Manager;
