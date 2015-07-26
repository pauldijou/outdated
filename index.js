var _ = require('lodash');
var chalk = require('chalk');
var textTable = require('text-table');
var stringLength = require('string-length');
var logSymbols = require('log-symbols');
var inquirer = require('inquirer');
var utils = require('./lib/utils');
var Dependency = require('./lib/dependency');
var context = require('./lib/context');

var managers = {
  npm: require('./lib/npm'),
  bower: require('./lib/bower'),
  jspm: require('./lib/jspm')
};

// Options:
// silent[Boolean]: output inside console or  not
// all[Boolean]: output all dependencies (only display invalid dependencies by default)
// prune[Boolean]: if true, will prune all unused dependencies at the end
// update[Boolean]: if true, will update all installed dependencies at the end
// jsonUpdate[Boolean]: if true, will update JSON files to the latest dependencies and then install them
// verbose[Number]: if true, display more log and error stack trace
var defaults = {
  silent: false,
  all: false,
  ask: true,
  prune: false,
  update: false,
  jsonUpdate: false,
  verbose: false
};

// Perform the verification of all packages for all package manangers
function check() {
  context.verbose(1, '# Check');
  return Promise.all(_.map(managers, function (manager, name) {
    return manager.check().then(function (dependencies) {
      context.setDependencies(name, dependencies);
      return dependencies;
    }, function (err) {
      if (err && err.code === 'ENOTFOUND') {
        context.setDependencies(name, err);
      } else if (err && err.code === 'ECMDERR') {
        err.message += '\nPlease fix this dependency before runing outdated again.'
        context.setDependencies(name, err);
      } else {
        throw err;
      }
    });
  }));
}

// Output in the console the result of all the previous checks
function output() {
  context.verbose(1, '# Output');
  _.each(context.dependencies, function (dependencies, name) {
    var manager = managers[name];
    context.log('');
    context.log(chalk.underline(manager.name));

    if (dependencies.length === undefined && dependencies.code) {
      context.ok[name] = false;
      // An "expected" error happened (like a package not found in Bower)
      context.log(logSymbols.error + '  ' + dependencies.message);
      // Remove the error so nothing is processed further down
      context.setDependencies(name, []);
    } else if (dependencies.length === 0) {
      context.ok[name] = true;
      context.log(logSymbols.success + ' No dependencies.');
    } else {
      // Remove all valid dependencies by default
      if (!context.options.all) {
        dependencies = dependencies.filter(function (dep) {
          return !dep.is.ok;
        }).sort(function (dep1, dep2) {
          if (dep1.name < dep2.name) return -1
          else if (dep1.name > dep2.name) return 1
          else return 0;
        });
      }

      if (dependencies.length > 0) {
        context.ok[name] = false;
        context.log(textTable(Dependency.toTable(dependencies), {stringLength: stringLength}));
      } else {
        context.ok[name] = true;
        context.log(logSymbols.success + ' All dependencies are up-to-date.');
      }
    }
  });

  return context;
}

// Depending on the result of a check, will ask the user about actions to perform like pruning or updating
function askForDependencies(dependencies, name) {
  var manager = managers[name];
  var prompts = [];

  if (!context.options.prune && Dependency.hasAction('prune', dependencies)) {
    prompts.push({
      type: 'list',
      name: 'prune',
      message: 'You have unused ' + manager.name + ' packages. Do you want to prune them?',
      default: true,
      choices: [
        {name: 'Yes', value: true},
        {name: 'No', value: false}
      ]
    });
  }

  if (!context.options.update && Dependency.hasAction('update', dependencies)) {
    prompts.push({
      type: 'list',
      name: 'update',
      message: 'Do you want to install/update all outdated ' + manager.name + ' packages?',
      default: true,
      choices: [
        {name: 'Yes', value: true},
        {name: 'No', value: false}
      ]
    });
  }

  if (!context.options.jsonUpdate && Dependency.hasAction('jsonUpdate', dependencies)) {
    prompts.push({
      type: 'checkbox',
      name: 'jsonUpdate',
      message: 'Select any ' + manager.name + ' package to update outside of their current range',
      choices: dependencies.filter(function (dep) {
        return dep.actions.jsonUpdate;
      }).map(function (dep) {
        return {
          name: dep.name +': '+ dep.current +' -> '+ dep.updateTo(),
          value: dep
        }
      })
    });
  }

  return new Promise(function (resolve, reject) {
    if (prompts.length > 0) {
      context.log('');
      context.log(chalk.underline(manager.name));
    }

    inquirer.prompt(prompts, function (answers) {
      resolve(answers);
    });
  });
}

// Chain questions one package manager at a time
function ask() {
  context.verbose(1, '# Ask');
  if (context.options.ask) {
    // We could run all Promises in parallel but we totally don't want that
    // otherwise, we would have the first question for all managers at the same time... oops
    // Let's chain them
    var resultAnswers = Promise.resolve();

    _.each(context.dependencies, function (dependencies, name) {
      resultAnswers = resultAnswers.then(function () {
        return askForDependencies(dependencies, name).then(function (answers) {
          context.addAnswers(name, answers);
        });
      });
    });

    return resultAnswers;
  } else {
    // We consider that all default answers have been selected
    // (aka doing nothing)
    // One empty object for each result
    _.each(context.dependencies, function (dependencies, name) {
      context.addAnswers(name, {});
    });

    return context;
  }
}

// Perform all actions depending on options and user answers
function act() {
  context.verbose(1, '# Act');
  return Promise.all(_.map(context.answers, function (answers, name) {
    var manager = managers[name];
    var dependencies = context.dependencies[name];
    var result = Promise.resolve();

    if ((context.options.prune || answers.prune) && Dependency.hasAction('prune', dependencies)) {
      result = result.then(manager.prune);
    }

    if (context.options.jsonUpdate && Dependency.hasAction('jsonUpdate', dependencies)) {
      result = result.then(function () {
        return manager.jsonUpdate(dependencies.filter(function (dep) {
          return dep.actions.jsonUpdate;
        }));
      });
    } else if (answers.jsonUpdate && answers.jsonUpdate.length > 0) {
      result = result.then(function () {
        return manager.jsonUpdate(answers.jsonUpdate);
      });
    } else if ((context.options.update || answers.update) && Dependency.hasAction('update', dependencies)) {
      // That's an "else if" because "jsonUpdate" will also do an "update" anyway
      result = result.then(function () {
        return manager.update();
      });
    }

    return result;
  }));
}

function logError(err) {
  var prefix = '[' + chalk.red('ERROR') + '] ';
  context.log('');
  context.log(prefix + 'A totally unexpected error just happened. I am deeply sorry about that.');
  context.log(prefix + 'Please, raise an issue on the bug tracker and explain how you used the tool and copy/paste the stack trace below.');
  context.log(prefix + 'Thanks a lot for your help and sorry again.');
  context.log(prefix + 'Bug tracker at: https://github.com/pauldijou/outdated/issues');
  context.log('');
  context.stack(err);
  throw err;
}

function goodbye() {
  context.verbose(1, '# Goodbye');
  context.log('');

  var allOk = _.reduce(context.ok, function (acc, current) {
    return acc && current;
  }, true);

  if (allOk) {
    context.log('Everything is so perfect in this project that you totally deserve a lollipop ----()');
    context.log('');
  }

  return context;
}

// The main function chaining all previous ones
function outdated(opts) {
  context.setOptions(opts, defaults)

  context.verbose(1, '# Outdated');
  context.verbose(2, opts);

  context.log('');
  context.info('Loading dependencies... (this might take some time)');

  return Promise.resolve()
    .then(check)
    .then(output)
    .then(ask)
    .then(act)
    .then(goodbye)
    .catch(logError);
}

module.exports = outdated;
module.exports.managers = managers;
