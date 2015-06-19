var _ = require('lodash');
var utils = module.exports;

utils.write = function (filename, obj) {
  require('graceful-fs').writeFileSync(filename, JSON.stringify(obj, null, 2));
};

utils.prop = function (propName, checkFn) {
  return function (value) {
    return checkFn(value[propName]);
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
    if (dep1.name !== dep2.name) {
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

  equalsTo: function (deps1) {
    return function (deps2) {
      return utils.dependencies.equals(deps1, deps2);
    };
  }
};

utils.results = {
  equal: function (res1, res2) {
    if (!res1.ok && !res2.ok) {
      if (res1.value.code === res2.value.code) {
        return true;
      } else {
        console.error('Different codes: ' + res1.value.code + ' !== ' + res2.value.code);
        return false;
      }
    } else if (res1.ok && res2.ok) {
      return utils.dependencies.equals(res1.value, res2.value);
    } else {
      console.error('One result is ok but not the other.');
      return false;
    }
  },

  equals: function (results1, results2) {
    return _.every(_.zipWith(results1, results2, function (res1, res2) {
      var e = utils.results.equal(res1, res2);
      return e;
    }), Boolean);
  },

  equalsTo: function (results1) {
    return function (results2) {
      return utils.results.equals(results1, results2);
    };
  }
}
