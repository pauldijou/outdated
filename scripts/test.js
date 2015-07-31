#!/usr/bin/env node

'use strict'

var fs = require('graceful-fs');
var path = require('path');
var cp = require('child_process');
var argv = require('yargs').argv;
var utils = require('../test/utils.js');

function getTests() {
  return fs.readdirSync(path.resolve(__dirname, '..', 'test')).filter(function (filename) {
    return filename.indexOf('.') < 0;
  });
}

if (argv._[0] === 'reset') {
  var folders = [];

  if (argv._.length === 1) {
    folders = getTests();
  } else {
    folders = argv._.slice(1);
  }

  folders.forEach(function (folder) {
    utils.reset(path.resolve(__dirname, '..', 'test', folder));
  });
} else {
  var command = './node_modules/mocha/bin/mocha --recursive --no-timeouts --reporter mocha-better-spec-reporter';

  if (argv._.length === 0) {
    argv._ = getTests();
  }

  command = argv._.reduce(function (c, t) {
    return c + ' ' + path.resolve(__dirname, '..', 'test', t, 'test.js');
  }, command);

  cp.execSync(command, {stdio: 'inherit'});
}
