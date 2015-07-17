var path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');
var jspm = require('jspm');
var fs = Promise.promisifyAll(require('graceful-fs'));
var utils = require('./utils');
var Dependency = require('./dependency');
var Manager = require('./manager');
var npm = require('./npm');

var jspmConfig = require('../node_modules/jspm/lib/config');
var jspmInstall = require('../node_modules/jspm/lib/install');

var dependencyKeys = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
];

function packageJSON(dir) {
  return fs.readFileAsync(path.join(dir || '.', 'package.json'), 'utf8');
}

// Setup env before doing anything
jspm.setPackagePath('.');

// To prevent running jspm.load for each package when asking for the latest version,
// let's run it once and use it for all
var loaded = jspmConfig.load();

function jspmLoad(data) {
  return loaded.then(function () {
    return data;
  });
}

function jspmLoader() {
  return jspmLoad().then(function () {
    return jspmConfig.loader
  });
}

function jspmPjson() {
  return jspmLoad().then(function () {
    return jspmConfig.pjson
  });
}

function execJspm(args) {
  var cp = require('child_process');

  if (!_.isArray(args)) {
    args = args.split(' ');
  }

  args.unshift(path.resolve(__dirname, '..', 'node_modules/jspm/jspm.js'));

  return new Promise(function (resolve, reject) {
    var updater = cp.spawn('node', args, {
      cwd: process.cwd()
    });

    updater.on('error', function (err) {
      reject(err);
    });

    updater.on('exit', function () {
      resolve();
    })
  });
}

function jspmClean() {
  return execJspm('clean');
}

function jspmUpdate() {
  return execJspm('update');
}

module.exports = new Manager({
  name: 'jspm',
  dependencies: function () {
    return Promise.all([jspmLoader(), jspmPjson()]).then(function (results) {
      // var jsonData = results[0];
      var loader = results[0];
      var pjson = results[1];

      var dependencies = {};

      // Locally installed dependencies
      _.forEach(loader.baseMap || {}, function (dep, name) {
        var cloned = _.clone(dep, true);
        cloned.local = dep.version;
        dependencies[name] = cloned;
      });

      // Merge with dependencies form PJSON which might not be locally installed yet
      _.forEach(dependencyKeys, function (key) {
        _.forEach(pjson[key] || {}, function (dep, name) {
          var current = dep.version;

          if (dep.registry === 'github') {
            current = dep.package + '#' + dep.version;
          }

          if (!dependencies[name]) {
            dependencies[name] = _.clone(dep, true);
          }

          dependencies[name].current = current;
        });
      });

      // Map to outdated Dependency
      return _.map(dependencies, function (dep, name) {
        return new Dependency({
          name: name,
          current: dep.current,
          local: dep.local,
          dependency: utils.current(pjson.pjson, name),
          hacks: {
            registry: dep.registry,
            package: dep.package
          }
        });
      });
    });
  },
  latest: function (dep) {
    if (dep.hacks.registry === 'npm') {
      return npm.utils.latest({name: dep.hacks.package});
    } else {
      // We don't have to handle Git registry since it will be done automatically by the manager
      return Promise.resolve({skipped: true});
    }
  },
  prune: jspmClean,
  update: jspmUpdate,
  jsonFile: function () {
    return packageJSON().then(function (file) {
      return {
        filename: path.join(process.cwd(), 'package.json'),
        content: file
      };
    });
  }
});
