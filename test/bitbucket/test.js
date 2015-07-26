var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var utils = require('../utils');

function getGit(repo) {
  return {type: 'bitbucket', user: 'pauldijou', project: repo};
}

var dependencies = {
  npm: [
    new utils.Dependency({name: 'does-not-exist-never', current: '1.0.0', skipped: true, error: {code: 'NOTFOUND'}, git: getGit('does-not-exist-never')}),
    new utils.Dependency({name: 'test-npm-update', current: 'v1.0.1', local: '1.0.1', latest: '1.0.2', git: getGit('test-npm-update')}),
    new utils.Dependency({name: 'outdated-test-2', current: 'de70aaa06f0410de463edf2813150fdc0edad2ca', local: '1.0.0', skipped: true, git: getGit('outdated-test-2')}),
    new utils.Dependency({name: 'outdated-test', current: '1.0.0', local: '1.0.0', latest: '2.0.0', git: getGit('outdated-test')})
  ],
  bower: [
    new utils.Dependency({name: 'test-npm-update', current: 'v1.0.1', local: '1.0.1', latest: '1.0.2', git: getGit('test-npm-update')}),
    new utils.Dependency({name: 'outdated-test-2', current: 'de70aaa06f0410de463edf2813150fdc0edad2ca', skipped: true, git: getGit('outdated-test-2')}),
    new utils.Dependency({name: 'outdated-test', current: '1.0.0', local: '1.0.0', latest: '2.0.0', git: getGit('outdated-test')})
  ],
  jspm: []
};

var postDependencies = {
  npm: [
    new utils.Dependency({name: 'does-not-exist-never', current: '1.0.0', skipped: true, error: {code: 'NOTFOUND'}, git: getGit('does-not-exist-never')}),
    new utils.Dependency({name: 'test-npm-update', current: 'v1.0.2', local: '1.0.2', latest: '1.0.2', git: getGit('test-npm-update')}),
    new utils.Dependency({name: 'outdated-test-2', current: 'de70aaa06f0410de463edf2813150fdc0edad2ca', local: '1.0.0', skipped: true, git: getGit('outdated-test-2')}),
    new utils.Dependency({name: 'outdated-test', current: '2.0.0', local: '2.0.0', latest: '2.0.0', git: getGit('outdated-test')})
  ],
  bower: [
    new utils.Dependency({name: 'test-npm-update', current: 'v1.0.2', local: '1.0.2', latest: '1.0.2', git: getGit('test-npm-update')}),
    new utils.Dependency({name: 'outdated-test-2', current: 'de70aaa06f0410de463edf2813150fdc0edad2ca', skipped: true, git: getGit('outdated-test-2')}),
    new utils.Dependency({name: 'outdated-test', current: '2.0.0', local: '2.0.0', latest: '2.0.0', git: getGit('outdated-test')})
  ],
  jspm: []
};

var outdated;
var outdated2;

describe('Bitbucket dependencies', function () {
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
      "name": "test-bitbucket",
      "dependencies": {
        "does-not-exist-never": "git+https://bitbucket.org/pauldijou/does-not-exist-never#1.0.0",
        "test-npm-update": "git+https://bitbucket.org/pauldijou/test-npm-update.git#v1.0.2"
      },
      "devDependencies": {
        "outdated-test-2": "git+https://bitbucket.org/pauldijou/outdated-test-2#de70aaa06f0410de463edf2813150fdc0edad2ca",
        "outdated-test": "git+https://bitbucket.org/pauldijou/outdated-test#2.0.0"
      }
    });
  });

  it('should update bower.json', function () {
    return expect(outdated.then(function () { return require('./bower.json') })).to.eventually.deep.equal({
      "name": "test-bitbucket",
      "dependencies": {
        "test-npm-update": "git+https://bitbucket.org/pauldijou/test-npm-update.git#v1.0.2"
      },
      "devDependencies": {
        "outdated-test-2": "git+https://bitbucket.org/pauldijou/outdated-test-2#de70aaa06f0410de463edf2813150fdc0edad2ca",
        "outdated-test": "pauldijou/outdated-test#2.0.0"
      }
    });
  });

  it('should read new dependencies', function () {
    return expect(outdated2.then(utils.check('dependencies', postDependencies))).to.eventually.be.true;
  });
})
