var Promise = require('bluebird');
var request = require('request');
var semver = require('semver');
var _ = require('lodash');

var errors = ['EADDRINFO', 'ETIMEDOUT', 'ECONNRESET'];

var rateLimits = {
  github: 60,
  bitbucket: 60000
};

function get(url, extract) {
  return new Promise(function (resolve, reject) {
    request({
      method: 'GET',
      url: url,
      headers: {
        'user-agent': 'node'
      }
    }, function (err, response, body) {
      if (err) {
        reject(err);
      } else {
        var res = response.toJSON();
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          res.data = extract(JSON.parse(body));
        } else {
          res.data = undefined;
        }

        resolve(res);
      }
    });
  }).then(function (response) {
    console.log(response);
    // If the repo has been moved to another url
    if (response.statusCode === 301) {
      console.log('redirect', response.headers.Location);
      return get(response.headers.Location, extract);
    } else {
      return response;
    }
  });
}

function latestGithub(infos) {
  return get('https://api.github.com/repos/'+infos.user+'/'+infos.project+'/tags?per_page=9999999999', function (tags) {
    return tags.map(function (r) {
      return r.name;
    });
  });
}

function latestBitbucket(infos) {
  return get('https://bitbucket.org/api/1.0/repositories/'+infos.user+'/'+infos.project+'/tags', function (tags) {
    return Object.keys(tags);
  });
}

function latestGitlab(infos) {
  // TODO: find an idea to add authentication since all Gitlab API require it
}

module.exports = {
  latest: function (name, infos) {
    var resultPromise, rateLimitHeader;
    var result = {name: name, skipped: true, git: infos};

    switch (infos.type) {
      case 'github':
        resultPromise = latestGithub(infos);
        rateLimitHeader = 'x-ratelimit-limit';
        break;
      case 'bitbucket':
        resultPromise = latestBitbucket(infos);
        break;
      case 'gitlab':
        // resultPromise = latestGitlab(infos);
        resultPromise = Promise.resolve({name: name, skipped: true});
        break;
      default:
        resultPromise = Promise.resolve({name: name, skipped: true});
    }

    return resultPromise.then(function (response) {
      if (response.data) {
        // All good! Yeah!
        var versions = (response.data || []).filter(function (v) {
          return semver.valid(v);
        }).map(function (v) {
          return /[0-9]/.test(v.slice(0, 1)) ? v : v.slice(1);
        });

        result.skipped = false;
        result.latest = semver.maxSatisfying(versions, '*');
        result.versions = versions;
      } else if (response.statusCode && response.statusCode === 429) {
        // We reach the rate limit for this provider
        result.error = {code: 'RATELIMIT', limit: rateLimits[infos.type]};
      } else if (response.statusCode && response.statusCode === 403) {
        if (response.headers && response.headers['X-RateLimit-Remaining'] === 0) {
          // Github rate limit
          result.error = {code: 'RATELIMIT', limit: rateLimits[infos.type]};
        } else {
          // Private package
          result.error = {code: 'FORBIDDEN'};
        }
      } else if (response.statusCode && response.statusCode === 404) {
        // Package not found or hidden because private
        result.error = {code: 'NOTFOUND'};
      }

      return result;
    }).catch(function (err) {
       if (errors.indexOf(error.code) < 0) {
        // Request failed due to network problem, just skip the package
        result.error = error;
        return result;
      } else {
        // Unknow error, let it bubble up
        throw err;
      }
    });
  }
};
