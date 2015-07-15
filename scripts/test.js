#!/usr/bin/env node

'use strict'

var cp = require('child_process');
var argv = require('yargs').argv;

var command = './node_modules/mocha/bin/mocha --recursive --no-timeouts --reporter mocha-better-spec-reporter';

if (argv._.length > 0) {
  command = argv._.reduce(function (c, t) {
    return c + ' test/' + t + '/*.js';
  }, command);
}

cp.execSync(command, {stdio: 'inherit'});
