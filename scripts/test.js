#!/usr/bin/env node

'use strict'

var fs = require('graceful-fs');
var path = require('path');
var cp = require('child_process');
var argv = require('yargs').argv;
var utils = require('../test/utils.js');

if (argv._[0] === 'reset') {
  var folders = [];

  if (argv._.length === 1) {
    folders = fs.readdirSync();
  } else {
    folders = argv._.slice(1);
  }

  console.log('RESET', folders);
  folders.forEach(function (folder) {
    utils.reset(path.resolve(__dirname, '..', 'test', folder));
  });
} else {
  var command = './node_modules/mocha/bin/mocha --recursive --no-timeouts --reporter mocha-better-spec-reporter';

  command = argv._.reduce(function (c, t) {
    return c + ' test/' + t + '/*.js';
  }, command);

  cp.execSync(command, {stdio: 'inherit'});
}
