var _ = require('lodash');
var utils = module.exports;
var cp = require('child_process');

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
}

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

  equal: function (dep1, dep2) {
    if (!dep1 || !dep2) {
      return dep1 === dep2;
    } else if (dep1.name !== dep2.name) {
      console.error('Different names: ' + dep1.name + ' !== ' + dep2.name);
    } else if (dep1.current !== dep2.current) {
      console.error('Different currents ['+dep1.name+']: ' + dep1.current + ' !== ' + dep2.current);
    } else if (dep1.latest !== dep2.latest) {
      console.error('Different latests ['+dep1.name+']: ' + dep1.latest + ' !== ' + dep2.latest);
    } else if (dep1.local !== dep2.local) {
      console.error('Different locals ['+dep1.name+']: ' + dep1.local + ' !== ' + dep2.local);
    } else {
      return true;
    }

    return false;
  },

  equals: function (deps1, deps2) {
    return _.every(_.zipWith(utils.dependencies.sort(deps1), utils.dependencies.sort(deps2), function (dep1, dep2) {
      return utils.dependencies.equal(dep1, dep2);
    }), Boolean);
  },

  check: function (wrapper1, wrapper2) {
    return _.isEqual(Object.keys(wrapper1), Object.keys(wrapper2)) &&
      _.every(_.map(Object.keys(wrapper1), function (value, key) {
        return utils.dependencies.equals(wrapper1[key], wrapper2[key]);
      }));
  }
};
