var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var utils = require('../utils');

var dependencies = {
  npm: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', local: '1.5.0', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', latest: '1.0.1'}),
    new utils.Dependency({name: 'does-not-exist-never', current: '1.0.0', skipped: true, error: {code: 'NOTFOUND'}}),
    new utils.Dependency({name: 'outdated-test-2', local: '1.0.0'}),
    new utils.Dependency({name: 'fake-but-awesome', local: '1.0.0'})
  ],
  bower: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', local: '1.5.0', latest: '2.0.0'}),
    new utils.Dependency({name: 'outdated-test-2', local: '1.0.0', latest: '1.0.0'})
  ],
  jspm: [
    new utils.Dependency({name: 'outdated-test', current: '^1.0.0', local: '1.0.1', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', latest: '1.0.1'}),
    new utils.Dependency({name: 'fake-but-awesome', local: '1.0.0'})
  ]
};

var postDependencies = {
  npm: [
    new utils.Dependency({name: 'outdated-test', current: '^2.0.0', local: '2.0.0', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', local: '1.0.1', latest: '1.0.1'}),
    new utils.Dependency({name: 'does-not-exist-never', current: '1.0.0', skipped: true, error: {code: 'NOTFOUND'}})
  ],
  bower: [
    new utils.Dependency({name: 'outdated-test', current: '^2.0.0', local: '2.0.0', latest: '2.0.0'})
  ],
  jspm: [
    // FIXME: remove when jspm clean fixed
    new utils.Dependency({name: 'fake-but-awesome', local: '1.0.0'}),
    new utils.Dependency({name: 'outdated-test', current: '^2.0.0', local: '2.0.0', latest: '2.0.0'}),
    new utils.Dependency({name: 'test-npm-update', current: '^1.0.0', local: '1.0.1', latest: '1.0.1'})
  ]
};

var outdated;
var outdated2;

describe('Complex dependencies', function () {
  before(function () {
    outdated = utils.run(__dirname, {
      silent: true,
      ask: false,
      prune: true,
      update: true,
      jsonUpdate: true
    });

    outdated2 = outdated.then(function () {
      return utils.run(__dirname, {
        silent: true,
        ask: false
      })
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

  it('should update package.json', function () {
    return expect(outdated.then(function () { return require('./package.json') })).to.eventually.deep.equal({
      name: 'test-complex',
      dependencies : {
        'test-npm-update': '^1.0.0',
        'does-not-exist-never': '1.0.0'
      },
      devDependencies: {
        'outdated-test': '^2.0.0'
      },
      jspm: {
        dependencies: {
          "test-npm-update": "npm:test-npm-update@^1.0.0"
        },
        devDependencies: {
          "outdated-test": "npm:outdated-test@^2.0.0"
        }
      }
    });
  });

  it('should update bower.json', function () {
    return expect(outdated.then(function () { return require('./bower.json') })).to.eventually.deep.equal({
      name: 'test-complex',
      dependencies : {
        'outdated-test': '^2.0.0'
      }
    });
  });

  it('should read new dependencies', function () {
    return expect(outdated2.then(utils.check('dependencies', postDependencies))).to.eventually.be.true;
  });
})
