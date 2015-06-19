var _ = require('lodash');
var chalk = require('chalk');
var textTable = require('text-table');
var stringLength = require('string-length');
var logSymbols = require('log-symbols');
var inquirer = require('inquirer');
var utils = require('./lib/utils');
var Dependency = require('./lib/dependency');
var Context = require('./lib/context');

var managers = {
  npm: require('./lib/npm'),
  bower: require('./lib/bower')
}

// Options:
// dir[String]: the root folder where to look for JSON files
// silent[Boolean]: output inside console or  not
// all[Boolean]: output all dependencies (only display invalid dependencies by default)
// prune[Boolean]: if true, will prune all unused dependencies at the end
// update[Boolean]: if true, will update all installed dependencies at the end
// jsonUpdate[Boolean]: if true, will update JSON files to the latest dependencies and then install them
// verbose[Boolean]: if true, display more log and error stack trace
var defaults = {
  dir: '.',
  silent: false,
  all: false,
  ask: true,
  prune: false,
  update: false,
  jsonUpdate: false,
  verbose: false
};

// Perform the verification of all packages for all package manangers
function check(context) {
  return Promise.all(_.map(managers, function (manager, name) {
    return manager.check(context).then(function (dependencies) {
      context.addDependencies(name, dependencies);
      return dependencies;
    });
  })).then(function () {
    return context;
  });
}

// Output in the console the result of all the previous checks
function output(context) {
  _.each(context.dependencies, function (dependencies, name) {
    var manager = managers[name];
    context.log('');
    context.log(chalk.underline(manager.name));

    if (dependencies.length === 0) {
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
        context.log(textTable(Dependency.toTable(dependencies), {stringLength: stringLength}));
      } else {
        context.log(logSymbols.success + ' All dependencies are up-to-date.');
      }
    }
  });

  return context;
}

// Depending on the result of a check, will ask the user about actions to perform like pruning or updating
function askForDependencies(context, dependencies, name) {
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
      message: 'Do you want to update all outdated packages?',
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
      message: 'Select any package to update outside of their current range',
      choices: dependencies.filter(function (dep) {
        return dep.actions.jsonUpdate;
      }).map(function (dep) {
        return {
          name: dep.name +': '+ dep.current +' -> '+ Dependency.update(dep.current, dep.latest),
          value: {name: dep.name, version: Dependency.update(dep.current, dep.latest)}
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
function ask(context) {
  if (context.options.ask) {
    // We could run all Promises in parallel but we totally don't want that
    // otherwise, we would have the first question for all managers at the same time... oops
    // Let's chain them
    var resultAnswers = Promise.resolve(context);

    _.each(context.dependencies, function (dependencies, name) {
      resultAnswers = resultAnswers.then(function (context) {
        return askForDependencies(context, dependencies, name).then(function (answers) {
          context.addAnswers(name, answers);
          return context;
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
function act(context) {
  return Promise.all(_.map(context.answers, function (answers, name) {
    var manager = managers[name];
    var result = Promise.resolve({});

    if (context.options.prune || answers.prune) {
      result = result.then(manager.prune);
    }

    if (context.options.jsonUpdate) {
      result = result.then(function () {
        return manager.jsonUpdate(context, _.map(context.dependencies[name], function (dep) {
          return {name: dep.name, version: Dependency.update(dep.current, dep.latest)}
        }));
      });
    } else if (answers.jsonUpdate && answers.jsonUpdate.length > 0) {
      result = result.then(function () {
        return manager.jsonUpdate(context, answers.jsonUpdate);
      });
    } else if (context.options.update || answers.update) {
      // That's an "else if" because "jsonUpdate" will also do an "update" anyway
      result = result.then(manager.update);
    }

    return result;
  })).then(function () {
    return context;
  });
}

function logError(context) {
  return function (err) {
    var prefix = '[' + chalk.red('ERROR') + '] ';
    context.log('');
    context.log(prefix + 'A totally unexpected error just happened. I am deeply sorry about that.');
    context.log(prefix + 'Please, raise an issue on the bug tracker and explain how you used the tool and copy/paste the stack trace below.');
    context.log(prefix + 'Thanks a lot for your help and sorry again.');
    context.log(prefix + 'Bug tracker at: https://github.com/pauldijou/outdated/issues');
    context.log('');
    context.stack(err);
    throw err;
  };
}

// The main function chaining all previous ones
function outdated(opts) {
  var context = Context.init(opts, defaults);

  context.log('');
  context.info('Loading dependencies... (this might take some time)');

  return Promise.resolve(context)
    .then(check)
    .then(output)
    .then(ask)
    .then(act)
    .catch(logError(context));
}

module.exports = outdated;
module.exports.managers = managers;
