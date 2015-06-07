var path = require('path');
var Promise = require('bluebird');
var bower = require('bower');
var bowerJson = require('bower-json');
var fs = Promise.promisifyAll(require('graceful-fs'));

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
    return json.directory;
  }, function (error) {
    return 'bower_components';
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
  return bowerJSON(context.options.dir).then(function (json) {
    return json[key] || {};
  })
};

module.exports = new Manager({
  name: 'Bower',
  latest: bowerInfo,
  local: function (context, name) {
    return bowerDirectory().then(function (dir) {
      return bowerJSON(path.join(context.options.dir, dir, name)).then(function (json) {
        return {name: name, local: json.version};
      });
    });
  },
  prune: bowerPrune,
  update: bowerUpdate,
  jsonUpdate: function (context, packages) {
    return bowerJSON(context.options.dir).then(function (json) {
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
