var inquirer = require('inquirer');
var request = require('request');
var logSymbols = require('log-symbols');
var chalk = require('chalk');
var textTable = require('text-table');
var config = require('./config');

var nowISO = new Date().toISOString();
var authorizationName = 'outdated CLI - ' + nowISO;

var methods = {
  token: {
    name: 'Token',
    message: 'Enter directly a token that you already had generated'
  },
  password: {
    name: 'Password',
    message: 'Enter your username and password and let us request the token for you'
  }
};

var providers = [
  {
    id: 'github',
    name: 'GitHub',
    endpoint: 'https://api.github.com',
    path: '/authorizations',
    method: 'POST',
    headers: {
      twoFA: 'X-GitHub-OTP'
    },
    body: {
      scopes: ['repo'],
      note: authorizationName
    },
    methods: ['token', 'password']
  }, {
    id: 'bitbucket',
    name: 'Bitbucket',
    endpoint: '',
    path: '/authorizations',
    method: 'POST',
    headers: {},
    body: {
      scopes: ['repo'],
      note: 'outdated CLI'
    },
    methods: ['token']
  }
];

function getProvider(id) {
  return providers.reduce(function (res, prov) {
    if (prov.id === id) {
      res = prov;
    }
    return res;
  }, undefined);
}

function error(err) {
  if (err.message) {
    console.log(logSymbols.error + chalk.red(' [Error] ') + err.message);
  }
}

var addPrompts = [{
  type: 'list',
  name: 'provider',
  message: 'For which provider do you want to add an authorization?',
  choices: providers.map(function (prov) {
    return {
      name: prov.name,
      value: prov
    };
  })
}, {
  type: 'list',
  name: 'method',
  message: 'Which method do you prefer?',
  choices: function (answers) {
    return answers.provider.methods.map(function (method) {
      return {
        name: methods[method].message,
        value: method
      };
    });
  },
  when: function (answers) {
    return answers.provider.methods.length > 1;
  }
}, {
  type: 'input',
  name: 'token',
  message: 'Enter the OAuth token',
  when: function (answers) {
    return answers.provider.methods.length === 1 || answers.method === 'token';
  }
}, {
  type: 'input',
  name: 'username',
  message: function (answers) {
    return 'What is your ' + answers.provider.name + ' username?';
  },
  when: function (answers) {
    return answers.method === 'password';
  }
}, {
  type: 'password',
  name: 'password',
  message: function (answers) {
    return 'What is your ' + answers.provider.name + ' password?';
  },
  when: function (answers) {
    return answers.method === 'password';
  }
}, {
  type: 'input',
  name: 'twoFA',
  message: function (answers) {
    return 'What is your ' + answers.provider.name + ' two-factor authentication code? (empty if none)';
  },
  when: function (answers) {
    return answers.method === 'password' && !!answers.provider.headers.twoFA;
  }
}, {
  type: 'input',
  name: 'endpoint',
  message: 'Which authorization endpoint to use? (if you have a private installation)',
  default: function (answers) {
    return answers.provider.endpoint;
  }
}];

function add() {
  return config.load().then(function (conf) {
    // Ask questions about the new authorization
    return new Promise(function (resolve) {
      inquirer.prompt(addPrompts, function (answers) {
        resolve({
          conf: conf,
          answers: answers
        });
      });
    });
  }).then(function (context) {
    // Create the request to create the new authorization and execute it
    var answers = context.answers;
    var provider = answers.provider;

    if (answers.token) {
      context.body = {
        token: answers.token
      };
      return Promise.resolve(context);
    } else {
      return new Promise(function (resolve, reject) {

        var headers = {
          'user-agent': 'outdated'
        };

        if (answers.twoFA) {
          headers[provider.headers.twoFA] = answers.twoFA;
        }

        console.log('');
        console.log(logSymbols.info + ' Requesting authorization from ' + provider.name + '...');

        request(answers.endpoint + provider.path, {
          method: provider.method,
          headers: headers,
          auth: {
            username: answers.username,
            password: answers.password
          },
          json: true,
          body: provider.body
        }, function (err, res, body) {
          if (err) {
            reject(err);
          }

          console.log(res.headers);
          console.log(res.statusCode);
          console.log(res.statusMessage);
          console.log(body);

          if (res.statusCode >= 200 && res.statusCode < 300 && body) {
            context.body = body;
            resolve(context);
          } else if (body && body.message) {
            reject(body);
          } else {
            reject({
              message: '[HTTP '+res.statusCode+'] Looks like something went wrong somewhere...'
            });
          }
        });
      });
    }
  }).then(function (context) {
    // Save the authorization
    var conf = context.conf;
    var body = context.body;
    var answers = context.answers;
    var provider = answers.provider;

    if (!conf.authorizations) {
      conf.authorizations = [];
    }

    conf.authorizations.push({
      provider: provider.id,
      method: answers.method,
      endpoint: answers.endpoint,
      name: authorizationName,
      token: body.token,
      hashedToken: body.hashed_token,
      scopes: body.scopes || [],
      created: body.created_at || nowISO
    });

    return config.save(conf);
  }).then(function () {
    console.log('');
    console.log(logSymbols.success + ' Authorization added');
  }).catch(error);
}

function list() {
  return config.load().then(function (conf) {
    return conf.authorizations || [];
  }).then(function (authorizations) {
    if (authorizations.length === 0) {
      console.log('No authorizations');
    } else {
      console.log(textTable([['Provider', 'Authorization', 'Token']].concat(
        authorizations.map(function (auth) {
          var provider = getProvider(auth.provider);
          return [provider.name, auth.name, auth.token];
        })
      )));
    }
  }).catch(error);
}

function removeOne(conf, auth) {
  return new Promise(function (resolve, reject) {
    if (auth.method === 'password') {
      var provider = getProvider(auth.provider);
      inquirer.prompts([{
        type: 'input',
        name: 'username',
        message: 'What is your ' + provider.name + ' username?'
      }, {
        type: 'password',
        name: 'password',
        message: 'What is your ' + provider.name + ' password?'
      }, {
        type: 'input',
        name: 'twoFA',
        message: 'What is your ' + provider.name + ' two-factor authentication code? (empty if none)';,
        when: function (answers) {
          return !!answers.provider.headers.twoFA;
        }
      }], function (answers) {
        var headers = {
          'user-agent': 'outdated'
        };

        if (answers.twoFA) {
          headers[provider.headers.twoFA] = answers.twoFA;
        }

        console.log('');
        console.log(logSymbols.info + ' Deleting authorization from ' + provider.name + '...');

        request(answers.endpoint + provider.path, {
          method: 'DELETE',
          headers: headers,
          auth: {
            username: answers.username,
            password: answers.password
          }
        }, function (err, res, body) {
          if (err) {
            reject(err);
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(conf.authorizations.indexOf(auth));
          } else if (body && body.message) {
            reject(body);
          } else {
            reject({
              message: '[HTTP '+res.statusCode+'] Looks like something went wrong somewhere...'
            });
          }
        });
      });
    } else if (auth.method === 'token') {
      resolve(conf.authorizations.indexOf(auth));
    }
  }).then(function (idx) {
    conf.authorizations.splice(idx, 1);
    return conf;
  });
}

function remove() {
  return config.load().then(function (conf) {
    // Generate prompts based on existing authorizations
    return {
      conf: conf,
      prompts: [{
        type: 'checkbox',
        name: 'removed',
        message: 'Which authorizations do you want to remove?',
        choices: (conf.authorizations || []).map(function (auth, idx) {
          return {
            name: auth.endpoint,
            value: idx
          };
        })
      }]
    };
  }).then(function (context) {
    // Remove picked authorizations from the configuration
    return new Promise(function (resolve, reject) {
      inquirer.prompt(context.promtps, function (answers) {
        context.config.authorizations = (context.config.authorizations || []).filter(function (v, idx) {
          return answers.removed.indexOf(idx) < 0;
        });
        resolve(context);
      });
    });
  }).then(function (context) {
    // Save the new configuration
    return config.save(context.config);
  }).then(function () {
    console.log('');
    console.log(logSymbols.success + ' Authorizations removed');
  }).catch(error);
}

module.exports.add = add;
module.exports.list = list;
module.exports.remove = remove;
