var path = require('path');
var Promise = require('bluebird');
var bower = require('bower');
var bowerJson = require('bower-json');
var fs = Promise.promisifyAll(require('graceful-fs'));
var utils = require('./utils');

var Manager = require('./manager');

var dependencyKeys = [
  'dependencies',
  'devDependencies'
];

function bowerRC(context) {
  return fs.readFileAsync(path.join(context.directory(), '.bowerrc'), 'utf8').then(JSON.parse);
}

function bowerDirectory(context) {
  return bowerRC(context).then(function (json) {
    return path.join(context.directory(), json.directory);
  }, function (error) {
    return utils.ifEnoent(error, function () {
      return path.join(context.directory(), 'bower_components');
    });
  });
}

function bowerJSON(dir) {
  return new Promise(function (resolve, reject) {
    bowerJson.read(dir || '.', function (err, json) {
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
      resolve({name: name, latest: infos.latest.version, versions: infos.versions || []});
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
  return bowerJSON(context.directory()).then(function (json) {
    return json[key] || {};
  })
};

module.exports = new Manager({
  name: 'Bower',
  latest: bowerInfo,
  localDirectory: function (context) {
    return bowerDirectory(context);
  },
  local: function (context, name) {
    return bowerDirectory(context).then(function (dir) {
      return bowerJSON(path.join(dir, name)).then(function (json) {
        return {name: name, local: json.version};
      });
    });
  },
  prune: bowerPrune,
  update: bowerUpdate,
  jsonUpdate: function (context, packages) {
    return bowerJSON(context.directory()).then(function (json) {
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
  dependencies: function (context) {
    return dependencyKeys.map(function (dep) {
      return getDependencies(context, dep);
    });
  }
});
