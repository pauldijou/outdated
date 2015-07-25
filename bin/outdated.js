#!/usr/bin/env node

'use strict'

var yargs = require('yargs');
var chalk = require('chalk');
var logSymbols = require('log-symbols');

var legend = chalk.cyan('Legend') + ':\n'
  + logSymbols.success + '  All good, nothing to do (hidden by default)\n'
  + logSymbols.info + '  Something strange happened (see Infos column)\n'
  + logSymbols.warning + '  You might want to do something\n'
  + logSymbols.error + '  You probably need to do something';

var glossary = chalk.cyan('Glossary') + ':\n'
  + chalk.bold('Skipped') + ': couldn\'t handle the package (see Infos column)\n'
  + chalk.bold('Prune') + ': remove packages locally installed but not used anymore\n'
  + chalk.bold('Install') + ': download the package inside your project\n'
  + chalk.bold('Update') + ': increase the locally installed version\n'
  + chalk.bold('Current') + ': the range you defined inside your JSON files\n'
  + chalk.bold('Local') + ': the locally installed version\n'
  + chalk.bold('Wanted') + ': the greatest version inside your current range\n'
  + chalk.bold('Latest') + ': the greatest stable version of the package\n'
  + chalk.bold('Non-stable') + ': local is greater than latest...';

var warning = chalk.yellow('Warning') + ': using "latest" option without asking will automatically update your JSON files to latest versions. If you want to play it safe, do not use this option and keep the "ask" option to true.'

var argv = yargs
  .version(function() {
    return require('../package').version;
  })
  .alias('v', 'version')
  .usage('\nUsage: ' + chalk.cyan('outdated') + '[command] [options]\n\n' + legend + '\n\n' + glossary + '\n\n' + warning)
  .command('auth add', 'Create a new token for a specific provider')
  .command('auth list', 'Display all available authorizations')
  .command('auth remove', 'Allow you to remove one or more existing authorizations')
  .example('$0', 'Display all outdated packages and ask you if you want to update them.')
  .example('$0 -a', 'Display all packages and ask you if you want to update them.')
  .example('$0 -a --no-ask', 'Display all packages.')
  .example('$0 -apu --no-ask', 'Display all packages and automatically prune and update them.')
  .options({
    s: {
      alias: 'silent',
      default: false,
      type: 'boolean',
      describe: 'Disable console output'
    },
    a: {
      alias: 'all',
      default: false,
      type: 'boolean',
      describe: 'Display all packages'
    },
    k: {
      alias: 'ask',
      default: true,
      type: 'boolean',
      describe: 'Ask you for pruning and updating'
    },
    p: {
      alias: 'prune',
      default: false,
      type: 'boolean',
      describe: 'Prune all unused packages'
    },
    u: {
      alias: 'update',
      default: false,
      type: 'boolean',
      describe: 'Update to the wanted version'
    },
    l: {
      alias: 'latest',
      default: false,
      type: 'boolean',
      describe: 'Update to the latest version'
    },
    V: {
      alias: 'verbose',
      default: false,
      type: 'boolean',
      describe: 'More stuff on your console output'
    }
  })
  .alias('h', 'help')
  .showHelpOnFail(false, "Specify --help for available options")
  .epilog('License Apache 2. Copyright 2015 Paul Dijou.')
  .argv;

if (argv.help) {
  console.log(yargs.help());
} else if (argv._[0] === 'auth') {
  if (argv._[1] === 'add') {
    require('../lib/auth.js').add();
  } else if (argv._[1] === 'list') {
    require('../lib/auth.js').list().catch(function (err) {
      if (err.message) {
        console.log(logSymbols.error + chalk.red(' [Error] ') + err.message);
      }
    });
  } else if (argv._[1] === 'remove') {
    require('../lib/auth.js').remove().catch(function (err) {
      if (err.message) {
        console.log(logSymbols.error + chalk.red(' [Error] ') + err.message);
      }
    });
  } else {
    console.log(logSymbols.error + chalk.red(' [Error]') + ' You can only use [add] or [remove] with the [auth] command.')
  }
} else {
  require('../index')({
    silent: argv.silent,
    all: argv.all,
    ask: argv.ask,
    prune: argv.prune,
    update: argv.update,
    jsonUpdate: argv.latest,
    verbose: argv.verbose
  });
}
