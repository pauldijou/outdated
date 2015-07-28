System.config({
  "baseURL": "/",
  "defaultJSExtensions": true,
  "transpiler": "none",
  "paths": {
    "npm:*": "packages/npm/*"
  }
});

System.config({
  "map": {
    "outdated-test": "npm:outdated-test@1.0.1"
  }
});

