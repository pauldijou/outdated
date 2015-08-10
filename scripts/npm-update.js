#!/usr/bin/env node

'use strict'

var file = require('path').resolve(__dirname, '..', 'lib', 'npm.js');
var npm = require(file);

npm.utils.load().then(function () {
  return npm.utils.install(process.argv.slice(2));
});
