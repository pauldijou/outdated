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
  return fs.readFileAsync('.bowerrc', 'utf8').then(JSON.parse, function (err) {
    return {};
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
    bower.commands.prune()
    .on('end', function (infos) {
      resolve();
    }).on('error', function (err) {
      reject(err);
    });
  });
}

function bowerUpdate() {
  return new Promise(function (resolve, reject) {
    bower.commands.update()
    .on('end', function (infos) {
      resolve();
    }).on('error', function (err) {
      reject(err);
    });
  });
}

module.exports = new Manager({
  name: 'Bower',
  color: 'yellow',
  dependencies: function () {
    return Promise.all([this.jsonData(), bowerList(), bowerRC()]).then(function (results) {
      var jsonData = results[0];
      var list = results[1];
      var bowerrc = results[2];

      return dependencyKeys.map(function (depName) {
        return _.map(list[depName] || {}, function (dep, name) {
          return new Dependency({
            name: name,
            current: utils.current(jsonData, name),
            local: dep.missing ? undefined : dep.pkgMeta.version,
            latest: dep.update && dep.update.latest,
            versions: dep.versions || [],
            missing: !!dep.missing,
            extraneous: !!dep.extraneous,
            hacks: {
              shorthandResolver: bowerrc['shorthand-resolver']
            }
          });
        });
      }).reduce(function (acc, current) {
        return acc.concat(current);
      }, []);
    });
  },
  latest: function (dep) {
    return bowerInfo(dep.name).then(function (infos) {
      return {name: dep.name, latest: infos.latest.version, versions: infos.versions || []};
    });
  },
  prune: bowerPrune,
  update: bowerUpdate,
  jsonFile: function () {
    return new Promise(function (resolve, reject) {
      bowerJson.find('.', function (err, filename) {
        if (err) {
          reject(err);
        } else {
          resolve(filename);
        }
      });
    }).then(function (filename) {
      return fs.readFileAsync(filename, 'utf8').then(function (content) {
        return {
          filename: filename,
          content: content
        };
      });
    });
  }
});
