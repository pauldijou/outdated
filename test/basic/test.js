var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var expect = chai.expect;
var utils = require('../utils');

var npm = {
  dependencies: {
    'test-npm-update': '^1.0.0'
  }
};

var outdated;

describe('Classic outdated', function () {
  before(function () {
    utils.write(__dirname + '/package.json', npm);
    outdated = require('../../index')({
      dir: __dirname,
      silent: false,
      ask: false
    });
  });

  after(function () {
    utils.write(__dirname+ '/package.json', npm);
  });

  it('should be fulfilled', function () {
    return expect(outdated).to.be.fulfilled;
  });

  it('should have options', function () {
    return expect(outdated).to.eventually.have.deep.property('options');
  });

  it('should have results', function () {
    return expect(outdated).to.eventually.have.deep.property('results');
  });
})
