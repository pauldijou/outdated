#!/usr/bin/env node

'use strict'

var file = require('path').resolve(__dirname, '..', 'lib', 'npm.js');
var npm = require(file);

npm.utils.load(process.argv.slice(2)).then(npm.utils.update);
