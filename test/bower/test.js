var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var utils = require('../utils');

var dependencies = {
  npm: [],
  bower: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', latest: '2.0.0'})
  ],
  jspm: []
};

var outdated;

describe('Bower dependencies only', function () {
  before(function () {
    outdated = utils.run(__dirname, {
      silent: true,
      ask: false
    }).then(function (context) {
      // There is a little problem that NPM list will try to find a package.json file
      // inside parent directories and, guess what?, there is one for the outdated project itself.
      // We will manually reset NPM dependencies. That kind of broke the test but whatever...
      context.dependencies.npm = [];
      return context;
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
