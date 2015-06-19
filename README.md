# Outdated

## Install

```
npm install -g outdated
```

## Usage

``` bash
outdated [options]
```

## Support

### Package managers

- NPM
- Bower

### Versioning

- Valid semver (ex: `1.2.3`, `^1.2.3`, `1.2.x`, ...)
- Github (ex: `username/project#v1.2.3`,`git://github.com/username/project#v1.2.3`)
- Bitbucket (ex: `git://bitbucket.org/username/project#v1.2.3`)

(if using a Git repository, git tags which are valid semver will be used as possible versions for the package)

## Help

``` bash
$ outdated -h

Usage: outdated [options]

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
Latest: the geatest stable version of the package
Non-stable: local is greater than latest...

Warning: using "latest" option without asking will automatically
update your JSON files to latest versions. If you want to play it safe, do not
use this option and keep the "ask" option to true.

Options:
  -d, --dir      Directory containing JSON files         [string] [default: "."]
  -s, --silent   Disable console output               [boolean] [default: false]
  -a, --all      Display all packages                 [boolean] [default: false]
  -k, --ask      Ask you for pruning and updating      [boolean] [default: true]
  -p, --prune    Prune all unused packages            [boolean] [default: false]
  -u, --update   Update to the wanted version         [boolean] [default: false]
  -l, --latest   Update to the latest version         [boolean] [default: false]
  -v, --verbose  More stuff on your console output    [boolean] [default: false]
  -V, --version  Show version number                                   [boolean]

Examples:
  outdated                Display all outdated packages and ask you if you want
                          to update them.
  outdated -a             Display all packages and ask you if you want to update
                          them.
  outdated -a --no-ask    Display all packages.
  outdated -apu --no-ask  Display all packages and automatically prune and
                          update them.

License Apache 2. Copyright 2015 Paul Dijou.
```

## Test

``` bash
npm test
```

## License

This software is licensed under the Apache 2 license, quoted below.

Copyright 2015 Paul Dijou ([http://pauldijou.fr](http://pauldijou.fr)).

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this project except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
