var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var utils = require('../utils');

var dependencies = {
  npm: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', local: '1.0.1', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', latest: '1.0.1'})
  ],
  bower: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', latest: '2.0.0'})
  ],
  jspm: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', local: '1.5.0', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', latest: '1.0.1'}),
    new utils.Dependency({name: 'babel', local: '5.8.9'}),
    new utils.Dependency({name: 'babel-runtime', local: '5.8.9'}),
    new utils.Dependency({name: 'core-js', local: '0.9.18'})
  ]
};

var outdated;

describe('Basic dependencies', function () {
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

  it('shouldn\'nt update package.json', function () {
    return expect(outdated.then(function () { return require('./package.json') })).to.eventually.deep.equal({
      "name": "test-basic",
      "dependencies": {
        "outdated-test": "^1.0.0",
        "test-npm-update": "^1.0.0"
      },
      "jspm": {
        "directories": {},
        "dependencies": {
          "outdated-test": "npm:outdated-test@^1.0.0",
          "test-npm-update": "npm:test-npm-update@^1.0.0"
        },
        "devDependencies": {}
      }
    });
  });

  it('shouldn\'nt update bower.json', function () {
    return expect(outdated.then(function () { return require('./bower.json') })).to.eventually.deep.equal({
      "name": "test-basic",
      "dependencies": {
        "outdated-test": "^1.0.0"
      }
    });
  });
})
