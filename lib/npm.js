var path = require('path');
var Promise = require('bluebird');
var npm = require('npm');
var fs = Promise.promisifyAll(require('graceful-fs'));
var spawn = require('child_process').spawn;

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

function getDependencies(key) {
  return packageJSON().then(function (json) {
    return json[key] || {};
  })
};

function npmLoad(data) {
  return new Promise(function (resolve, reject) {
    npm.load({}, function () {
      resolve(data);
    });
  });
}

function npmView(name) {
  return new Promise(function (resolve, reject) {
    npm.commands.view([name], true, function (err, data) {
      if (err) {
        reject(err);
      } else {
        var infos = data[Object.keys(data)[0]];
        resolve({name: name, latest: infos.version, versions: infos.versions || []});
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
  latest: function (name) {
    return npmLoad(name).then(npmView);
  },
  local: function (name) {
    return packageJSON(path.join('node_modules', name)).then(function (json) {
      return {name: name, local: json.version};
    });
  },
  prune: function () {
    return npmLoad().then(npmPrune);
  },
  update: function () {
    return npmLoad().then(npmUpdate);
  },
  jsonUpdate: function (packages) {
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
  },
  dependencies: dependencyKeys.map(getDependencies)
});
