var utils = module.exports;

utils.write = function (filename, obj) {
  require('graceful-fs').writeFileSync(filename, JSON.stringify(obj, null, 2));
};
