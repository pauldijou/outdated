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
  return fs.readFileAsync(path.join(dir || '.', 'package.json'), 'utf8').then(JSON.parse);
}

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
  dependencies: function (context) {
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
    });
  },
  prune: function () {
    return npmLoad().then(npmPrune);
  },
  update: function () {
    return npmLoad().then(npmUpdate);
  },
  jsonUpdate: function (context, packages) {
    return packageJSON().then(function (json) {
      packages.forEach(function (pack) {
        dependencyKeys.forEach(function (key) {
          if (json[key] && json[key][pack.name]) {
            json[key][pack.name] = pack.version;
          }
        });
        return json;
      });
    });
  }
});
