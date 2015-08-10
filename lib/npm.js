var path = require('path');
var Promise = require('bluebird');
var npm = require('npm');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('graceful-fs'));
var utils = require('./utils');
var Dependency = require('./dependency');
var context = require('./context');

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

function npmInstall(dependencies) {
  return new Promise(function (resolve, reject) {
    npm.commands.install(dependencies || [], function () {
      resolve();
    });
  });
}

function npmUpdate(dependencies) {
  return new Promise(function (resolve, reject) {
    npm.commands.update(dependencies || [], function () {
      resolve();
    });
  });
}

function npmLatest(dep) {
  return npmLoad(dep.name).then(npmView).then(function (data) {
    var infos = data[Object.keys(data)[0]];
    // If only one version, prior to NPM 3.0, return a string rather than an array
    if (!_.isArray(infos.versions)) {
      infos.versions = [infos.versions];
    }
    return {name: dep.name, latest: infos.version, versions: infos.versions || []};
  }).catch(function (err) {
    // Package doesn't exist in NPM registry
    if (err === '404 Not Found' || (err.code && err.code === 'E404')) {
      return {name: dep.name, skipped: true, versions: [], error: {code: 'NOTFOUND'}};
    } else {
      throw err;
    }
  });
}

module.exports = new Manager({
  name: 'NPM',
  color: 'red',
  dependencies: function () {
    return Promise.all([this.jsonData(), npmLoad().then(npmList)]).then(function (results) {
      var jsonData = results[0];
      var list = results[1];

      // Fix NPM not display missing devDependencies
      dependencyKeys.forEach(function (key) {
        _.forEach(jsonData[key] || {}, function (current, name) {
          if (!list.dependencies[name]) {
            list.dependencies[name] = current;
          }
        });
      });

      // It looks like all dependency types are merged inside "list.dependencies"
      return _.map(list.dependencies || {}, function (dep, name) {
        // If the value is a String, it's the dep version and it's not locally installed
        var missing = _.isString(dep);

        if (missing) {
          return new Dependency({
            name: name,
            current: utils.current(jsonData, name),
            local: undefined,
            missing: true,
            extraneous: false
          });
        } else {
          return new Dependency({
            name: name,
            current: utils.current(jsonData, name),
            local: dep.version,
            missing: false,
            extraneous: dep.extraneous
          });
        }
      });
    });
  },
  latest: npmLatest,
  prune: function () {
    return npmLoad().then(npmPrune);
  },
  update: function () {
    // return npmLoad().then(npmUpdate);

    // There is a huge problem:
    // readJSON (called inside both npm.list and npm.update) is caching packages inside LRU
    // meaning it will use the old version of package.json when actually doing the update
    var cp = require('child_process');

    // Also, only update packages that weren't skipped
    // since NPM update will crash in case of package not found
    var args = (context.dependencies.npm || []).reduce(function (names, dep) {
      if (dep.actions.update || dep.actions.jsonUpdate) {
        names.push(dep.name + '@' + dep.target());
      }
      return names;
    }, [path.resolve(__dirname, '..', 'scripts', 'npm-update.js')]);

    return new Promise(function (resolve, reject) {
      var updating = cp.spawn('node', args, {
        cwd: process.cwd(),
        stdio: 'inherit'
      });

      updating.on('error', function (err) {
        reject(err);
      });

      updating.on('exit', function () {
        resolve();
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
  },
  utils: {
    load: npmLoad,
    install: npmInstall,
    update: npmUpdate,
    latest: npmLatest
  }
});
