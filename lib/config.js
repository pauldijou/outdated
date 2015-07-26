var Promise = require('bluebird');
var inquirer = require('inquirer');
var logSymbols = require('log-symbols');
var appConfig = require('application-config')('outdated');

module.exports = {
  load: load,
  save: save,
  clean: clean,
  display: display,
  reset: reset
}

function load() {
  return new Promise(function (resolve, reject) {
    appConfig.read(function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data || {});
      }
    });
  });
}

function save(config) {
  return new Promise(function (resolve, reject) {
    appConfig.write(config, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(config);
      }
    });
  });
}

function clean() {
  return new Promise(function (resolve, reject) {
    appConfig.trash(function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function display() {
  return load().then(function (config) {
    console.log(JSON.stringify(config, null, 2));
  });
}

function reset() {
  return new Promise(function(resolve, reject) {
    console.log('This will remove all locally saved configurations.');
    console.log('It will do nothing else.');
    console.log('(it will not delete any remote OAuth tokens for example)\n');

    inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to reset your local config?',
      default: false
    }], function (answers) {
      resolve(answers.confirm);
    });
  }).then(function (confirm) {
    if (confirm) {
      return clean().then(function () {
        console.log('\n' + logSymbols.success + ' Done! Everything has been removed.');
      });
    } else {
      console.log('\n' + logSymbols.success + ' Fine with me, nothing to do!');
      return;
    }
  });
}
