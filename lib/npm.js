var path = require('path');
var Promise = require('bluebird');
var npm = require('npm');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('graceful-fs'));
var Dependency = require('./dependency');

var Manager = require('./manager');

var dependencyKeys = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

function packageJSON(dir) {
  return fs.readFileAsync(path.join(dir || '.', 'package.json'), 'utf8');
}

// To prevent running npm.load for each package when asking for the latest version,
// let's run it once and use it for all
var loaded = new Promise(function (resolve, reject) {
  npm.load({}, function () {
    resolve();
  });
});

function npmLoad(data) {
  return loaded.then(function () {
    return data;
  });
}

function npmView(name) {
  return new Promise(function (resolve, reject) {
    npm.commands.view([name], true, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function npmList() {
  return new Promise(function (resolve, reject) {
    npm.commands.ls([], true, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function npmPrune() {
  return new Promise(function (resolve, reject) {
    npm.commands.prune([], function () {
      resolve();
    });
  });
}

function npmUpdate() {
  return new Promise(function (resolve, reject) {
    npm.commands.update([], function () {
      resolve();
    });
  });
}

module.exports = new Manager({
  name: 'NPM',
  dependencies: function () {
    return npmLoad().then(npmList).then(function (data) {
      // It looks like all type of dependency are merged inside "data.dependencies"
      return _.map(data.dependencies || {}, function (dep, name) {
        // If the value is a String, it's the dep version and it's not locally installed
        var missing = _.isString(dep);

        if (missing) {
          return new Dependency({
            name: name,
            current: dep,
            local: undefined,
            missing: true,
            extraneous: false
          });
        } else {
          return new Dependency({
            name: name,
            current: data._dependencies[name],
            local: dep.version,
            missing: false,
            extraneous: dep.extraneous
          });
        }
      });
    });
  },
  latest: function (name) {
    return npmLoad(name).then(npmView).then(function (data) {
      var infos = data[Object.keys(data)[0]];
      // If only one version, prio to NPM 3.0, return a string rather than an array
      if (!_.isArray(infos.versions)) {
        infos.versions = [infos.versions];
      }
      return {name: name, latest: infos.version, versions: infos.versions || []};
    }).catch(function (err) {
      // Package doesn't exist in NPM registry
      if (err.code && err.code === 'E404') {
        return {name: name, skipped: true, versions: [], error: {code: 'NOTFOUND'}};
      } else {
        throw err;
      }
    });
  },
  prune: function () {
    return npmLoad().then(npmPrune);
  },
  update: function () {
    // return npmLoad().then(npmUpdate);

    // There is a huge problem:
    // readJSON (called inside both npm.list and npm.update) is caching packages inside LRU
    // meaning it will use the old version of package.json when actually doing the update
    var cp = require('child_process');

    return new Promise(function (resolve, reject) {
      cp.exec('npm update', {
        cwd: process.cwd()
      }, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },
  jsonFile: function () {
    return packageJSON().then(function (file) {
      return {
        filename: path.join(process.cwd(), 'package.json'),
        content: file
      };
    });
  }
});
