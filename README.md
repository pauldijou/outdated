# Outdated

**WORK IN PROGRESS.** It does some stuff but it's not fully working yet. Coming soon to you favorite package manager.

## Install

```
npm install -g outdated
```

## Usage

``` bash
outdated [options]
```

## Support

- NPM
- Bower

## Help

``` bash
$ outdated -h
Usage: outdated [options]

Warning: using "latest" option without asking will automatically
update your JSON files to latest versions. If you want to play it safe, do no
use this option and keep the "ask" option to true.

Options:
  -s, --silent   Disable console output               [boolean] [default: false]
  -a, --all      Display all packages rather than only outdated ones
                                                      [boolean] [default: false]
  -k, --ask      Ask you before taking actions like pruning or updating
                                                       [boolean] [default: true]
  -p, --prune    Prune all unused packages
                                                      [boolean] [default: false]
  -u, --update   Update all outdated packages to the wanted version
                                                      [boolean] [default: false]
  -l, --latest   Update all outdated packages to the latest version
                                                      [boolean] [default: false]
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
```

## License

This software is licensed under the Apache 2 license, quoted below.

Copyright 2015 Paul Dijou ([http://pauldijou.fr](http://pauldijou.fr)).

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this project except in compliance with the License. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
