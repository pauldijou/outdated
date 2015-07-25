var Promise = require('bluebird');
var appConfig = require('application-config')('outdated');

module.exports.load = function () {
  return new Promise(function (resolve, reject) {
    appConfig.read(function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data || {});
      }
    });
  });
};

module.exports.save = function (config) {
  return new Promise(function (resolve, reject) {
    appConfig.write(config, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(config);
      }
    });
  });
};

module.exports.clean = function () {
  return new Promise(function (resolve, reject) {
    appConfig.trash(function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
