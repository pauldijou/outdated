var semver = require('semver');
var chalk = require('chalk');
var _ = require('lodash');
var logSymbols = require('log-symbols');
var hostedGitInfo = require("hosted-git-info");
var getUrl = require("github-url-from-username-repo");

function Dependency(res) {
  this.name = res.name;
  // The current range defined inside your JSON file
  this.current = res.current;
  // The version you have
  this.local = res.local;
  // The latest version of the package
  this.latest = res.latest;
  // All the versions of the package
  this.versions = res.versions || [];
  // Required but not locally installed
  this.missing = res.missing;
  // Locally installed but not needed
  this.extraneous = res.extraneous;
  // That's sad but we couldn't check this dependency
  this.skipped = !!res.skipped;
  // Did we had any problem?
  this.error = res.error;
  // Some flags
  this.is = {};
}

Dependency.prototype.setup = function () {
  // If current is empty string, it means any version
  if (this.current === '') {
    this.current = '*';
  }

  // Dependency validation
  if (!this.name) {
    throw new Error('You cannot have a dependency without a name.');
  }

  if (!this.skipped) {
    if (this.current && !semver.validRange(this.current)) {
      throw new Error('Current version of [' + this.name + '] is not valid: ' + this.current);
    }

    if (this.local && !semver.valid(this.local)) {
      throw new Error('Local version of [' + this.name + '] is not valid: ' + this.local);
    }

    if (this.latest && !semver.valid(this.latest)) {
      throw new Error('Latest version of [' + this.name + '] is not valid: ' + this.latest);
    }

    if (!this.current && !this.local) {
      throw new Error('WTF? Dependency [' + this.name + '] is neither inside JSON file nor locally installed. How can it be resolved at all?');
    }

    // If all ok, let's do more!
    // wanted == the version you should have
    this.wanted = this.current && semver.maxSatisfying(this.versions, this.current);

    // In NPM, you can release versions which are not the latest yet (using dist-tags)
    // this.wanted should be capped by this.latest since we don't want to propose pre-release versions
    if (this.wanted && this.latest && semver.gt(this.wanted, this.latest)) {
      this.wanted = this.latest;
    }

    // A few flags
    this.is = {
      // Trololo, you have a range that doesn't match any existing version
      impossible: this.current && !this.wanted && this.versions && this.versions.length,
      // Need prune
      extraneous: this.extraneous || !this.current,
      // Need update
      localOutdated: this.missing || !this.local || (this.wanted && semver.lt(this.local, this.wanted)),
      // Need JSON update + update
      currentOutdated: this.wanted && this.latest && semver.lt(this.wanted, this.latest),
      // The local version is outside the current range
      outside: this.current && this.local && !semver.satisfies(this.local, this.current),
      // The local version is greater than the latest version, display something about that
      over9000: this.local && this.latest && semver.gt(this.local, this.latest)
    };
  }

  this.actions = {
    prune: this.is.extraneous,
    update: this.is.localOutdated,
    jsonUpdate: this.is.currentOutdated
  };

  if (this.skipped) {
    this.icon = logSymbols.info;
    this.message = 'Skipped';

    if (this.error) {
      switch (this.error.code) {
        case 'RATELIMIT':
          this.message += ' (rate limit reached)';
          break;
        case 'FORBIDDEN':
          this.message += ' (private package)';
          break;
        case 'NOTFOUND':
          this.message += ' (package not found)';
          break;
        case 'EADDRINFO':
        case 'ETIMEDOUT':
        case 'ECONNRESET':
          this.message += ' (network problem during the request)';
          break;
        default:
          this.message += ' (' + this.error.code + ')';
      }
    } else {
      this.message += ' (version syntax not supported)';
    }
  } else if (this.is.impossible) {
    this.icon = logSymbols.error;
    this.message = 'Impossible: current range do not match any available version';
  } else if (this.is.extraneous) {
    this.icon = logSymbols.error;
    this.message = 'Prune';
  } else if (this.is.outside) {
    this.icon = logSymbols.error;
    this.message = 'Local outside current range';
  } else if (this.is.localOutdated || this.is.currentOutdated) {
    var prefix = this.local ? 'Update to' : 'Install';

    if (this.is.localOutdated && this.is.currentOutdated) {
      this.icon = logSymbols.error;
      this.message = prefix + ' wanted or latest';
    } else if (this.is.localOutdated) {
      this.icon = logSymbols.error;
      this.message = prefix + ' wanted';
    } else if (this.is.currentOutdated) {
      this.icon = logSymbols.warning;
      this.message = prefix + ' latest';
    }
  } else if(this.is.over9000) {
    this.icon = logSymbols.warning;
    this.message = 'Non-stable';
  } else {
    this.icon = logSymbols.success;
    this.message = '';
  }

  this.is.ok = (this.icon === logSymbols.success);
};

Dependency.prototype.updateTo = function () {
    if (_.startsWith(this.current, '^')) {
    return '^' + this.latest;
  } else if (_.startsWith(this.current, '~')) {
    return '~' + this.latest;
  } else if (_.startsWith(this.current, '>=')) {
    return '>=' + this.latest;
  } else if (_.startsWith(this.current, '>')) {
    return '>' + this.latest;
  } else if (_.startsWith(this.current, 'v')) {
    return 'v' + this.latest;
  } else if (_.endsWith(this.current, '.x.x')) {
    return semver.major(this.latest) + '.x.x';
  } else if (_.endsWith(this.current, '.x')) {
    return semver.major(this.latest) + '.' + semver.minor(this.latest) + '.x';
  } else {
    return this.latest;
  }
};

Dependency.prototype.trimmedCurrent = function () {
  if (this.current && this.current.indexOf('#') > -1) {
    return this.current.split('#').pop();
  } else if (this.current && this.current.indexOf('/') > -1) {
    return this.current.split('/').pop();
  } else {
    return this.current || '';
  }
};

// For debug purposes
Dependency.prototype.toString = function () {
  return this.name + ': ' + this.current + ' [' + this.local + '] -> ' + this.latest + ' [' + this.versions.slice(0, 4).toString() + ', ...]';
};

Dependency.prototype.extractGit = function () {
  var gitInfos;

  if (this.current && _.isString(this.current)) {
    gitInfos = hostedGitInfo.fromUrl(getUrl(this.current) || this.current);
  }

  if (gitInfos) {
    if (this.current.indexOf('#') > 0) {
      var parts  = this.current.split('#');
      var version = parts.pop();
      if (semver.validRange(version)) {
        gitInfos.current = version;
      } else {
        // Too hard to determine the wanted version from a SHA or a branch
        gitInfos = undefined;
      }
    } else {
      // No commit-ish, using the last version on master branch
      gitInfos.current = '*';
    }
  }

  this.git = gitInfos;
};

// Test if we support or should skip a package version
Dependency.prototype.analyze = function () {
  this.skipped = true;
  this.extractGit();

  if (!this.current) {
    this.skipped = false;
  } else if (semver.validRange(this.current)) {
    this.skipped = false;
  } else if (this.git) {
    switch (this.git.type) {
      case 'github':
      case 'bitbucket':
        this.current = this.git.current;
        this.skipped = false;
        break;
      case 'gitlab':
        break;
    }
  }
};

// Return an array representing one row in a displayed matrix of dependencies
Dependency.prototype.toColumns = function () {
  var current = this.trimmedCurrent(),
      local = this.local || '',
      wanted = this.wanted || '',
      latest = this.latest || '';

  var redUndefined = chalk.red('undefined');

  if (this.is.extraneous) {
    current = redUndefined;
    wanted = '';
    latest = '';
  } else if (this.skipped && this.current) {
    current = chalk.blue(current);
  }

  if (!this.local) {
    local = redUndefined;
  }

  if (!this.skipped && this.current) {
    if (!this.wanted) {
      wanted = redUndefined;
    }

    if (!this.latest) {
      latest = redUndefined;
    }

    if (this.is.localOutdated) {
      wanted = chalk.green(wanted);
    }

    if (this.is.currentOutdated) {
      latest = chalk.yellow(latest);
    }
  }

  return [
    this.icon,
    this.name,
    current,
    local,
    wanted,
    latest,
    this.message
  ];
};

// Convert an Array[Dependency] to an array of array representing a matrix to display
Dependency.toTable = function (dependencies) {
  return [
    [' ', 'Package', 'Current', 'Local', 'Wanted', 'Latest', 'Infos']
  ].concat(
    dependencies.map(function (dep) {
      return dep.toColumns();
    })
  );
}

// Test if at least one among all dependencies has the provided action
Dependency.hasAction = function (action, dependencies) {
  return dependencies.reduce(function (acc, dep) {
    return acc || dep.actions[action];
  }, false)
};

module.exports = Dependency;
