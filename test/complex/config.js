System.config({
  "baseURL": "/",
  "defaultJSExtensions": true,
  "transpiler": "none",
  "paths": {
    "npm:*": "jspm_packages/npm/*"
  }
});

System.config({
  "map": {
    "fake-but-awesome": "npm:fake-but-awesome@1.0.0",
    "outdated-test": "npm:outdated-test@1.0.1"
  }
});

