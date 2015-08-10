# Outdated

Manage, update and prune your dependencies like a boss.

See it in action with this [awesome demo](https://asciinema.org/a/24116) !

## Install

```bash
npm install -g outdated
# You can enable completion by doing
outdated --setup
```

## Usage

``` bash
outdated [command] [options]
```

## Support

### Package managers

- NPM
- Bower
- jspm

**Warning** There are still a few [problems](#problems-and-fixes). Most of them are linked to the corresponding issue to fix it.

### Versioning

- Valid semver (ex: `1.2.3`, `^1.2.3`, `1.2.x`, ...)
- GitHub (ex: `username/project#v1.2.3`,`git://github.com/username/project#v1.2.3`)
- Bitbucket (ex: `git+https://bitbucket.org/username/project#v1.2.3`)
- GitLab

If using a Git repository, git tags which are valid semver will be used as possible versions for the package.

If using GitLab, private repositories, or just reaching the API rate limit, create an authentication token by running `outdated auth add`. See the [authorizations section](#authorizations).

## Help

``` bash
$ outdated -h

Usage: outdated [command] [options]

Legend:
✔  All good, nothing to do (hidden by default)
i  Something strange happened (see Infos column)
⚠  You might want to do something
✖  You probably need to do something

Glossary:
Skipped: couldn't handle the package (see Infos column)
Prune: remove packages locally installed but not used anymore
Install: download the package inside your project
Update: increase the locally installed version
Current: the range you defined inside your JSON files
Local: the locally installed version
Wanted: the greatest version inside your current range
Latest: the greatest stable version of the package
Non-stable: local is greater than latest...

Warning: using "latest" option without asking will automatically
update your JSON files to latest versions. If you want to play it safe, do not
use this option and keep the "ask" option to true.

Commands:
  auth add      Create a new token for a specific provider
  auth list     Display all available authorizations
  auth remove   Allow you to remove one or more existing authorizations
  config        Display the locally stored configuration
  config reset  Removed all local files storing the configuration

Options:
  -s, --silent   Disable console output               [boolean] [default: false]
  -a, --all      Display all packages                 [boolean] [default: false]
  -k, --ask      Ask you for pruning and updating      [boolean] [default: true]
  -p, --prune    Prune all unused packages            [boolean] [default: false]
  -u, --update   Update to the wanted version         [boolean] [default: false]
  -l, --latest   Update to the latest version         [boolean] [default: false]
  -V, --verbose  More stuff on your console output                       [count]
  --npm          Enable or disable NPM checking                        [boolean]
  --bower        Enable or disable Bower checking                      [boolean]
  --jspm         Enable or disable jspm checking                       [boolean]
  -v, --version  Show version number                                   [boolean]

Examples:
  outdated                Display all outdated packages and ask you if you want
                          to update them.
  outdated -a             Display all packages and ask you if you want to update
                          them.
  outdated -a --no-ask    Display all packages.
  outdated -apu --no-ask  Display all packages and automatically prune and
                          update them.
  outdated --bower        Check only Bower dependencies.
  outdated --no-npm       Check all dependencies except NPM ones.

License Apache 2. Copyright 2015 Paul Dijou.
```

## Problems and fixes

- Prior to jspm 0.16, there is no way do differentiate a NPM package.json from a jspm unprefixed package.json. Please, use `outdated --no-npm` or `outdated --no-jspm` depending on your context.

- jspm pruning isn't currently working. Right now, it would be too much of hack to make it happen. Should be fixed with [#964](https://github.com/jspm/jspm-cli/issues/964).

- `npm update` target the biggest possible version, even beyond `latest` through dist-tags. This is kind of problematic since it can download alpha and beta versions without any warnings. This is why `outdated` actually use `npm install` to update your packages, targeting a specific version which will always be capped by the `latest` tag.

- NPM doesn't show any warning for missing devDependencies. `outdated` fix that and an [issue](https://github.com/npm/npm/issues/9097) has been opened.

- To prevent unpredictable behaviors, it uses locally installed versions of all package managers. This can be problematic if you are using another version in your project. For example, it's currently based on NPM 2 but more and more people are switching to NPM 3. I'm thinking about a solution around it.

## Enable or disable package managers

For each supported package managers, you have a CLI option with the same name. If setting one or more of those options to `true`, only those package managers will be checked. If setting one or more to `false`, all package managers except those ones will be checked.

```bash
# Only check NPM
outdated --npm
# Only check jspm and Bower
outdated --jspm --bower
# Check all except jspm
outdated --no-jspm
# Check all except NPM and jspm
outdated --no-npm --no-jspm
# Only check Bower
outdated --bower --no-npm
```

## Configuration

`outdated` might store local configuration if needed. Right now, it's mostly used for [authorizations](#authorizations). You can see the full stored configuration at any time and reset it if you want.

```bash
# Display all stored configuration
outdated config
# Remove all local files
outdated config reset
```

## Authorizations

**Work in progress**. While some stuff is working nicely, it does not cover all possible use-cases, only the easy and most common ones. If you need more features about this, please fill an issue.

In some case, you will need to authenticate yourself in order to perform an action.

- access GitLab API
- overcome GitHub rate limit
- access private repository in GitHub or Bitbucket
- and much more...

Rather than asking for username and password each time your are running `outdated`, we have a way to store such config. For security reasons, we never store username nor password but only authentication tokens. Those tokens will always be stored locally, on your computer, and never be send to any third-party server or whatever. You can revoke them at anytime. We handle two-factor authentication.

Currently, there are two methods to add a new token. You can directly enter the token, which is supported by all providers. Or you can enter your username and password and we will generate the token for you, this only works for GitHub right now. If you are generating the token yourself and the provider supports scopes, ensure that the token has, at least, read access to private repositories. When automatically generating the token, we will ask for the minimum possible scope but that might be more than just read access. For example, GitHub scope for private repositories is for both read and write access at the same time.

Here are the commands to manage tokens:

```bash
# Add a new token
outdated auth add
# List all tokens
outdated auth list
# Remove one or more tokens
outdated auth remove
```

**What is that endpoint stuff?**
This is useful if you have your own provider installation (for example, your own GitHub Enterprise). In this case, you need to enter the url which expose the API of your own installation. If you don't have such stuff, just keep the default value. That said, we don't support custom git endpoints inside `outdated` yet, it's more to be ready for the future.

**Why do I need to enter my password again when removing a token?**
That's because the token itself doesn't have access to creating or removing your tokens. And since we didn't store your username / password, there is no way to automatically remove a token that was generated by the CLI itself.

**It says I need to revoke the token myself. Didn't I just did that?**
When you directly entered a token, we know nothing on how you did generate it, so we can only remove it locally. It's up to you to revoke it inside the provider. They all have a nice interface for that.

## Test

``` bash
npm test
# You can run only the tests inside a subdirectory of 'test'
# with 'npm test [folder name] [folder name...]'
npm test complex
# If a test fails, you can reset it using
# 'npm test reset [folder name] [folder name...]'
npm test reset complex
# Or reset all tests
npm test reset
```

If you create new tests or edit an existing one, be sure to commit at least all those files and folders inside the test (`package.json`, `bower.json`, `.bowerrc`, `node_modules`, `bower_components` and `components`, `jspm_packages`, `packages`, `config.js`, `system_config.js`) **before** running the test since all will be reset at the end using `git checkout`. All `error: pathspec` in the logs are normal, it's just Git failing to found a file to checkout.

## License

This software is licensed under the Apache 2 license, quoted below.

Copyright 2015 Paul Dijou ([http://pauldijou.fr](http://pauldijou.fr)).

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this project except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
