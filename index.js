var _ = require('lodash');
var chalk = require('chalk');
var textTable = require('text-table');
var stringLength = require('string-length');
var logSymbols = require('log-symbols');
var inquirer = require('inquirer');
var utils = require('./lib/utils');
var Dependency = require('./lib/dependency');

var managers = [
  require('./lib/npm'),
  require('./lib/bower')
]

var logger;

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
  return Promise.all(_.map(managers, function (manager) {
    return manager.check(context);
  })).then(function (results) {
    context.results = results;
    return context;
  });
}

// Output in the console the result of all the previous checks
function output(context) {
  context.options.silent || context.results.forEach(function (res, index) {
    var manager = managers[index];
    logger.log('');
    logger.log(chalk.underline(manager.name));

    if (res.ok) {
      // Remove all valid dependencies by default
      if (!context.options.all) {
        res.value = res.value.filter(function (dep) {
          return !dep.is.ok;
        });
      }

      if (res.value.length > 0) {
        logger.log(textTable(Dependency.toTable(res.value), {stringLength: stringLength}));
      } else {
        logger.log(logSymbols.success + ' All dependencies are up-to-date.');
      }

    } else {
      logger.log(logSymbols.warning + ' We couldn\'t load any package for ' + manager.name + '. If you are not using it anyway, that`s fine, but otherwise, that might be a bug. In that case, please re-run using the "verbose" option to see the full error.');

      if (context.options.verbose) {
        logger.log('');
        logger.stack(res.value);
      }
    }
  });

  return context;
}

// Depending on the result of a check, will ask the user about actions to perform like pruning or updating
function askForResult(res, index) {
  if (!res.ok) {
    return Promise.resolve({});
  } else {
    var manager = managers[index];
    var prompts = [];

    if (Dependency.hasAction('prune', res.value)) {
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

    if (Dependency.hasAction('update', res.value)) {
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

    if (Dependency.hasAction('jsonUpdate', res.value)) {
      prompts.push({
        type: 'checkbox',
        name: 'jsonUpdate',
        message: 'Select any package to update outside of their current range',
        choices: res.value.filter(function (dep) {
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
        logger.log('');
        logger.log(chalk.underline(manager.name));
      }

      inquirer.prompt(prompts, function (answers) {
        resolve(answers);
      });
    });
  }
}

// Chain questions one package manager at a time
function ask(context) {
  if (context.options.ask) {
    // We could run all Promises in parallel but we totally don't want that
    // otherwise, we would have the first question for all managers at the same time... oops
    // Let's chain them
    context.answers = [];
    var resultAnswers = Promise.resolve(context);

    context.results.forEach(function (result, index) {
      resultAnswers = resultAnswers.then(function (context) {
        return askForResult(result, index).then(function (answers) {
          context.answers.push(answers);
          return context;
        });
      });
    });

    return resultAnswers;
  } else {
    // We consider that all default answers have been selected
    // (aka doing nothing)
    // One empty object for each result
    context.answers = context.results.map(function () { return {}; });
    return context;
  }
}

// Perform all actions depending on options and user answers
function act(context) {
  return Promise.all(context.answers.map(function (answers, index) {
    var manager = managers[index];
    var result = Promise.resolve({});

    if (context.options.prune || answers.prune) {
      result = result.then(manager.prune);
    }

    if (context.options.jsonUpdate || (answers.jsonUpdate && answers.jsonUpdate.length > 0)) {
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

function logError(err) {
  var prefix = '[' + chalk.red('ERROR') + '] ';
  logger.log('');
  logger.log(prefix + 'A totally unexpected error just happened. I am deeply sorry about that. ');
  logger.log(prefix + 'Please, raise an issue on the bug tracker and explain how you used the tool and copy/paste the stack trace below.');
  logger.log(prefix + 'Thanks a lot for your help and sorry again.');
  logger.log(prefix + 'Bug tracker at: https://github.com/pauldijou/outdated/issues');
  logger.log('');
  logger.stack(err);
}

// The main function chaining all previous ones
function outdated(opts) {
  var context = { options: _.merge({}, defaults, opts || {}) };
  logger = new utils.Logger(context.options);

  console.log(context.options.dir);

  logger.log('');
  logger.info('Loading dependencies...');

  return Promise.resolve(context)
    .then(check)
    .then(output)
    .then(ask)
    .then(act)
    .catch(logError);
}

module.exports = outdated;
module.exports.managers = managers;
