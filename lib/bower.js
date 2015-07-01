var path = require('path');
var Promise = require('bluebird');
var bower = require('bower');
var bowerJson = require('bower-json');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('graceful-fs'));
var utils = require('./utils');
var Dependency = require('./dependency');

var Manager = require('./manager');

var dependencyKeys = [
  'dependencies',
  'devDependencies'
];

function bowerRC() {
  return fs.readFileAsync('.bowerrc', 'utf8').then(JSON.parse);
}

function bowerDirectory() {
  return bowerRC().then(function (json) {
    return json.directory || 'bower_components';
  }, function (error) {
    return utils.ifEnoent(error, function () {
      return 'bower_components';
    });
  });
}

function bowerJSON(dir) {
  return new Promise(function (resolve, reject) {
    bowerJson.read(dir || '.', {validate: false}, function (err, json) {
      if (err) {
        reject(err);
      } else {
        resolve(json);
      }
    });
  });
}

function bowerInfo(name) {
  return new Promise(function (resolve, reject) {
    bower.commands.info(name)
    .on('end', function (infos) {
      resolve(infos);
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function bowerList() {
  return new Promise(function (resolve, reject) {
    bower.commands.list()
    .on('end', function (data) {
      resolve(data);
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function bowerPrune() {
  return new Promise(function (resolve, reject) {
    bower.commands.prune(name)
    .on('end', function (infos) {
      resolve();
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function bowerUpdate() {
  return new Promise(function (resolve, reject) {
    bower.commands.update(name)
    .on('end', function (infos) {
      resolve();
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function getDependencies(context, key) {
  return bowerJSON().then(function (json) {
    return json[key] || {};
  })
};

module.exports = new Manager({
  name: 'Bower',
  dependencies: function (context) {
    return bowerList().then(function (list) {
      return dependencyKeys.map(function (depName) {
        return _.map(list[depName] || {}, function (dep, name) {
          return new Dependency({
            name: name,
            current: !dep.extraneous && dep.endpoint.target,
            local: dep.missing ? undefined : dep.pkgMeta.version,
            latest: dep.update.latest,
            versions: dep.versions,
            missing: !!dep.missing,
            extraneous: !!dep.extraneous,
          });
        });
      }).reduce(function (acc, current) {
        return acc.concat(current);
      }, []);
    });
  },
  latest: function (name) {
    return bowerInfo(name).then(function (infos) {
      return {name: name, latest: infos.latest.version, versions: infos.versions || []};
    });
  },
  prune: bowerPrune,
  update: bowerUpdate,
  jsonUpdate: function (context, packages) {
    return bowerJSON().then(function (json) {
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
