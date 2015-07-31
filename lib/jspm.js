var path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');
var jspm = require('jspm');
var fs = Promise.promisifyAll(require('graceful-fs'));
var utils = require('./utils');
var Dependency = require('./dependency');
var Manager = require('./manager');
var npm = require('./npm');
var context = require('./context');

var jspmConfig = require('../node_modules/jspm/lib/config.js');
var jspmInstall = require('../node_modules/jspm/lib/install.js');

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

// Disable jspm UI
var jspmUI = require('../node_modules/jspm/lib/ui.js');

jspmUI.confirm = function () {
  return Promise.resolve(true);
};

jspmUI.input = function () {
  return Promise.resolve('.');
};

// To prevent running jspm.load for each package when asking for the latest version,
// let's run it once and use it for all
var loaded = jspmConfig.load();

function jspmLoad() {
  return loaded;
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
  args.push('-y');

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

function jsonFile() {
  return packageJSON().then(function (file) {
    return {
      filename: path.join(process.cwd(), 'package.json'),
      content: file
    };
  });
}

module.exports = new Manager({
  name: 'jspm',
  color: 'blue',
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
            package: dep.package,
            name: dep.name
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
      return Promise.resolve({});
    }
  },
  prune: jspmClean,
  update: function () {
    var json;
    var args = (context.dependencies.jspm || []).reduce(function (acc, dep) {
      if (dep.actions.update || dep.actions.jsonUpdate) {
        acc.push(dep.hacks.name + '@' + dep.target());
      }
      return acc;
    }, ['install']);

    // Dirty hack
    // jspm will actually update package.json with the exact version
    // when installing/updating new ones. We need to reverse that
    // to keep ranges
    return jsonFile().then(function (file) {
      json = file;
      return execJspm(args);
    }).then(function () {
      if (json) {
        return fs.writeFileAsync(json.filename, json.content, {encoding: 'utf8'});
      }
      return;
    });
  },
  jsonFile: jsonFile
});
