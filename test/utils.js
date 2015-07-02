var _ = require('lodash');
var utils = module.exports;
var cp = require('child_process');
var path = require('path');

utils.run = function (cwd, options) {
  return new Promise(function (resolve, reject) {
    var child = cp.fork(__dirname + '/fork.js', [], {
      cwd: cwd
    });

    var context = {};

    child.on('error', function (err) {
      reject(err);
    });

    child.on('exit', function () {
      resolve(context);
    });

    child.on('message', function (value) {
      context = value;
      child.disconnect();
    });

    child.send(options);
  });
};

function checkout(p) {
  try {
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
  checkout(path.join(dir, 'node_modules'));
  checkout(path.join(dir, 'bower_components'));
  checkout(path.join(dir, 'components'));
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
    var prefix = manager ? '[' + manager + ']' : '';

    if (!dep1 || !dep2) {
      if (dep1 !== dep2) {
        console.error(prefix + 'One undefined while not the other');
      }
      return dep1 === dep2;
    } else if (dep1.name !== dep2.name) {
      console.error(prefix + 'Different names: ' + dep1.name + ' !== ' + dep2.name);
    } else if (dep1.current !== dep2.current) {
      console.error(prefix + '['+dep1.name+'] Different currents: ' + dep1.current + ' !== ' + dep2.current);
    } else if (dep1.latest !== dep2.latest) {
      console.error(prefix + '['+dep1.name+'] Different latests: ' + dep1.latest + ' !== ' + dep2.latest);
    } else if (dep1.local !== dep2.local) {
      console.error(prefix + '['+dep1.name+'] Different locals: ' + dep1.local + ' !== ' + dep2.local);
    } else if (dep1.skipped !== dep2.skipped) {
      console.error(prefix + '['+dep1.name+'] Different skipped: ' + dep1.skipped + ' !== ' + dep2.skipped);
    } else if (dep1.error !== dep2.error) {
      if (dep1.error && !dep2.error) {
        console.error(prefix + '['+dep1.name+'] First dep has an error but not the second one');
      } else if (dep2.error && !dep1.error) {
        console.error(prefix + '['+dep1.name+'] Second dep has an error but not the first one');
      } else if (dep1.error.code !== dep2.error.code) {
        console.error(prefix + '['+dep1.name+'] Different error codes: ' + dep1.error.code + ' !== ' + dep2.error.code);
      } else {
        return true;
      }
      return false;
    } else {
      return true;
    }
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
