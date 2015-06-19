// A (package) manager is something like NPM or Bower
var Promise = require('bluebird');
var fs = require('graceful-fs');
var _ = require('lodash');
var git = require('./git');
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
// One out of two:
// localDirectory[(context) -> Promise(String)]: return the directory where local packages are installed
// localPackages[(context) -> Promise(Array[String])]: return the list of local packages
function Manager(opts) {
  this.name = opts.name;
  this.dependencies = opts.dependencies;
  this.prune = opts.prune.bind(this);
  this.update = opts.update.bind(this);

  this.localDirectory = opts.localDirectory && opts.localDirectory.bind(this);
  this.localPackages = opts.localPackages && opts.localPackages.bind(this);

  if (!this.localPackages) {
    if (!this.localDirectory) {
      throw new Error('A manager must have at least either a localPackage or a localDirectory function');
    } else {
      this.localPackages = function (context) {
        return this.localDirectory(context).then(function (dir) {
          return fs.readdirSync(dir);
        });
      }
    }
  }

  this.fn = {
    latest: opts.latest.bind(this),
    local: opts.local.bind(this),
    jsonUpdate: opts.jsonUpdate.bind(this)
  };
}

Manager.prototype.skipOrLatest = function (current, name) {
  var infos = Dependency.analyze(name, current);

  if (infos.skip) {
    return Promise.resolve({name: name, skipped: true});
  } else if (infos.git) {
    return git.latest(name, infos.git);
  } else {
    return this.fn.latest(name);
  }
}

Manager.prototype.latest = function (packages) {
  return Promise.all(_.map(packages, this.skipOrLatest.bind(this)));
};

Manager.prototype.local = function (context) {
  return this.localPackages(context).then(function (packages) {
    return Promise.all(packages.map(function (name) {
      return this.fn.local(context, name).catch(function (err) {
        // No local file means no local version
        return utils.ifEnoent(err, function () {
          return {name: name, local: undefined};
        });
      });
    }.bind(this)))
    .then(function (packages) {
      return packages.filter(function (pack) {
        return !!pack.local;
      });
    });
  }.bind(this))
  .catch(function (err) {
    return utils.ifEnoent(err, function () {
      // No local directory at all
      return [];
    });
  });
};

Manager.prototype.normalize = function (context, packages) {
  return !utils.hasDependencies(packages) ? Promise.resolve([]) : Promise.all([
    this.latest(packages),
    this.local(context)
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
  return this.allDependencies(context).then(function (packages) {
    return this.normalize(context, packages);
  }.bind(this), function (err) {
    return utils.ifEnoent(err, function () {
      return [];
    });
  });
};

Manager.prototype.jsonUpdate = function (packages) {
  return this.fn.jsonUpdate(packages).then(this.update);
};

module.exports = Manager;
