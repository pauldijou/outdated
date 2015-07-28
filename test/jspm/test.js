var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var utils = require('../utils');

var dependencies = {
  npm: [],
  bower: [],
  jspm: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', local: '1.0.1', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', latest: '1.0.1'})
  ]
};

var outdated;

describe('jspm dependencies only', function () {
  before(function () {
    outdated = utils.run(__dirname, {
      silent: true,
      ask: false
    });
  });

  after(function () {
    utils.reset(__dirname);
  });

  it('should be fulfilled', function () {
    return expect(outdated).to.be.fulfilled;
  });

  it('should have options', function () {
    return expect(outdated).to.eventually.have.deep.property('options');
  });

  it('should have dependencies', function () {
    return expect(outdated).to.eventually.have.deep.property('dependencies');
  });

  it('should have correct dependencies', function () {
    return expect(outdated.then(utils.check('dependencies', dependencies))).to.eventually.be.true;
  });
})
