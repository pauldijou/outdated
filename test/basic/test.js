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

var bower = {
  name: 'test',
  dependencies: {
    'jquery': '^2.0.0'
  }
};

var results = [
  {
    ok: true,
    value: [
      new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', latest: '1.0.1'})
    ]
  },
  {
    ok: true,
    value: [
      new utils.Dependency({name: 'jquery', current: '^2.0.0', latest: '2.1.4'})
    ]
  }
];

var outdated;

describe('Classic outdated', function () {
  before(function () {
    utils.write(__dirname + '/package.json', npm);
    utils.write(__dirname + '/bower.json', bower);
    outdated = require('../../index')({
      dir: __dirname,
      silent: false,
      verbose: true,
      ask: false
    });
  });

  after(function () {
    utils.write(__dirname + '/package.json', npm);
    utils.write(__dirname + '/bower.json', bower);
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

  it('should have correct dependencies', function () {
    return expect(outdated.then(utils.prop('results', utils.results.equalsTo(results)))).to.eventually.be.true;
  });
})
