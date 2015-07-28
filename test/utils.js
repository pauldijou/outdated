var _ = require('lodash');
var utils = module.exports;
var cp = require('child_process');
var path = require('path');
var fs = require('fs');

utils.run = function (cwd, options) {
  return new Promise(function (resolve, reject) {
    var child = cp.fork(__dirname + '/fork.js', [], {
      cwd: cwd
    });

    var result = {};

    child.on('error', function (err) {
      reject(err);
    });

    child.on('exit', function () {
      if (result.error) {
        reject(result.error);
      } else {
        resolve(result.value);
      }
    });

    child.on('message', function (value) {
      result = value;
      child.disconnect();
    });

    child.send(options);
  });
};

function checkout(p) {
  try {
    fs.statSync(p);
    cp.execSync('git checkout ' + p);
  } catch (e) {}
}

utils.reset = function (dir) {
  if (!dir) {
    throw new Error('utils.reset needs a path');
  }

  checkout(path.join(dir, 'package.json'));
  checkout(path.join(dir, 'bower.json'));
  checkout(path.join(dir, '.bowerrc'));
  checkout(path.join(dir, 'config.js'));
  checkout(path.join(dir, 'system_config.js'));
  checkout(path.join(dir, 'node_modules'));
  checkout(path.join(dir, 'bower_components'));
  checkout(path.join(dir, 'components'));
  checkout(path.join(dir, 'packages'));
  checkout(path.join(dir, 'jspm_packages'));
  cp.execSync('git clean -fd ' + dir);
};

utils.write = function (filename, obj) {
  require('graceful-fs').writeFileSync(filename, JSON.stringify(obj, null, 2));
};

utils.check = function (propName, value) {
  return function (context) {
    return utils[propName].check(value, context[propName]);
  };
};

utils.Dependency = require('../lib/dependency');

utils.dependencies = {
  sort: function (deps) {
    return _.sortBy(deps, function (dep) {
      return dep.name;
    });
  },

  equal: function (dep1, dep2, manager) {
    var prefix = manager ? '[' + manager + '] ' : '';
    if (dep1) {
      prefix += '[' + dep1.name + '] ';
    } else if (dep2) {
      prefix += '[' + dep2.name + '] ';
    }
    var result = true;

    function error(message) {
      result = false;
      console.log(prefix + message);
    }

    if (!dep1 || !dep2) {
      if (dep1 !== dep2) {
        error('One undefined while not the other');
      }
      result = (dep1 === dep2);
    } else if (dep1.name !== dep2.name) {
      error('Different names: ' + dep1.name + ' !== ' + dep2.name);
    } else if (dep1.current !== dep2.current) {
      error('Different currents: ' + dep1.current + ' !== ' + dep2.current);
    } else if (dep1.latest !== dep2.latest) {
      error('Different latests: ' + dep1.latest + ' !== ' + dep2.latest);
    } else if (dep1.local !== dep2.local) {
      error('Different locals: ' + dep1.local + ' !== ' + dep2.local);
    } else if (dep1.skipped !== dep2.skipped) {
      error('Different skipped: ' + dep1.skipped + ' !== ' + dep2.skipped);
    } else if (dep1.git !== dep2.git) {
      if (dep1.git && !dep2.git) {
        error('First dep has a git but not the second one');
      } else if (dep2.git && !dep1.git) {
        error('Second dep has a git but not the first one');
      } else if (dep1.git.type !== dep2.git.type) {
        error('Different git types: ' + dep1.git.type + ' !== ' + dep2.git.type);
      } else if (dep1.git.user !== dep2.git.user) {
        error('Different git users: ' + dep1.git.user + ' !== ' + dep2.git.user);
      } else if (dep1.git.project !== dep2.git.project) {
        error('Different git projects: ' + dep1.git.project + ' !== ' + dep2.git.project);
      }
    } else if (dep1.error !== dep2.error) {
      if (dep1.error && !dep2.error) {
        error('First dep has an error but not the second one');
      } else if (dep2.error && !dep1.error) {
        error('Second dep has an error but not the first one');
      } else if (dep1.error.code !== dep2.error.code) {
        error('Different error codes: ' + dep1.error.code + ' !== ' + dep2.error.code);
      }
    }

    return result;
  },

  equals: function (deps1, deps2, manager) {
    return _.every(_.zipWith(utils.dependencies.sort(deps1), utils.dependencies.sort(deps2), function (dep1, dep2) {
      return utils.dependencies.equal(dep1, dep2, manager);
    }), Boolean);
  },

  check: function (wrapper1, wrapper2) {
    if (!_.isEqual(Object.keys(wrapper1).sort(), Object.keys(wrapper2).sort())) {
      console.error('Not the same managers', Object.keys(wrapper1), Object.keys(wrapper2));
      return false;
    } else {
      return _.every(Object.keys(wrapper1).map(function (key) {
        return utils.dependencies.equals(wrapper1[key], wrapper2[key], key);
      }));
    }
  }
};
