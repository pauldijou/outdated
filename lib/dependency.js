var semver = require('semver');
var _ = require('lodash');
var logSymbols = require('log-symbols');

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
  // That's sad but we couldn't check this dependency
  this.skipped = !!res.skipped;
  // Some flags
  this.is = {};

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
      impossible: this.current && !this.wanted,
      // Need prune
      unused: !this.current,
      // Need update
      localOutdated: !this.local || (this.wanted && semver.neq(this.local, this.wanted)),
      // Need JSON update + update
      currentOutdated: this.wanted && this.latest && semver.lt(this.wanted, this.latest)
    };
  }

  this.actions = {
    prune: this.is.unused,
    update: this.is.localOutdated,
    jsonUpdate: this.is.currentOutdated
  };

  if (this.skipped) {
    this.icon = logSymbols.info;
    this.message = 'Couldn\'t check this dependency. Only support semver ranges for now.';
  } else if (this.is.impossible) {
    this.icon = logSymbols.error;
    this.message = 'Impossible: current range do not match any available version.';
  } else if (this.is.unused) {
    this.icon = logSymbols.error;
    this.message = 'Not used anymore. Should be pruned.';
  } else if (this.is.localOutdated) {
    this.icon = logSymbols.error;
    this.message = 'Better version available inside current range. Should be updated.';
  } else if (this.is.currentOutdated) {
    this.icon = logSymbols.warning;
    this.message = 'Better version available outside current range. Might be updated.';
  } else {
    this.icon = logSymbols.success;
    this.message = '';
  }

  this.is.ok = (this.icon === logSymbols.success)
}

// For debug purposes
Dependency.prototype.toString = function () {
  return this.name + ': ' + this.current + ' [' + this.local + '] -> ' + this.latest + ' [' + this.versions.slice(0, 4).toString() + ', ...]';
};

// Return an array representing one row in a displayed matrix of dependencies
Dependency.prototype.toColumns = function () {
  return [this.icon, this.name, this.current || '', this.local || '', this.wanted || '', this.latest || '', this.message];
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

// Test if we support or should skip a package range version
Dependency.skip = function (current) {
  if (semver.validRange(current)) {
    return false;
  } else {
    return true;
  }
};

Dependency.update = function (current, latest) {
    if (_.startsWith(current, '^')) {
    return '^' + latest;
  } else if (_.startsWith(current, '~')) {
    return '~' + latest;
  } else if (_.startsWith(current, '>=')) {
    return '>=' + latest;
  } else if (_.startsWith(current, '>')) {
    return '>' + latest;
  } else if (_.startsWith(current, 'v')) {
    return 'v' + latest;
  } else if (_.endsWith(current, '.x.x')) {
    return semver.major(latest) + '.x.x';
  } else if (_.endsWith(current, '.x')) {
    return semver.major(latest) + '.' + semver.minor(latest) + '.x';
  } else {
    return latest;
  }
};

// Merge the packages (from JSON files), latests (from remote) and local (from locally installed)
// to an Array[Dependency]
Dependency.normalize = function (packages, latest, local) {
  var res = {};

  Object.keys(packages).forEach(function (name) {
    res[name] = {name: name, current: packages[name]};
  });

  latest.forEach(function (lat) {
    if (!res[lat.name]) {
      res[lat.name] = {name: lat.name};
    }

    res[lat.name].latest = lat.latest;
    res[lat.name].versions = lat.versions;
  });

  local.forEach(function (loc) {
    if (!res[loc.name]) {
      res[loc.name] = {name: loc.name};
    }

    res[loc.name].local = loc.local;
  });

  return Object.keys(res).map(function (key) { return new Dependency(res[key]); });
};

module.exports = Dependency;
