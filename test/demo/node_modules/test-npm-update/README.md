# Test Update

This package only exists to test a strange behaviour inside NPM.

## tl;dr

Do not use `npm update` with any package which use custom dist-tags.

## Dist-tags

This package has officially those 3 last versions: `1.0.0`, `1.0.1` and `1.0.2`. But inside the `dist-tags` ([read more](https://docs.npmjs.com/cli/dist-tag)), we have two of them: the classic `latest` which refers to the latest stable release of the package and a custom one, named `canary`, indicating the last non-stable release of the package. If you are wondering if real projects are using such tags, the answer is **yes**, the `npm` package is using `latest` and `next` tags for it's weekly pre-release ([read more](https://github.com/npm/npm/wiki/Release-Process)).

Currently, `latest` points to `1.0.1` and `canary` to `1.0.2`. Meaning that if you run `npm view test-npm-update`, you will have something like:

```javascript
{
  name: 'test-npm-update',
  description '...',
  'dist-tags': { latest: '1.0.1', canary: '1.0.2' },
  versions: ['1.0.0', '1.0.1', '1.0.2'],
  version: '1.0.1',
  ...
}
```

## Versions

It's important to realize a few things here. `1.0.2` is a released version just as `1.0.0` and `1.0.1` and we will say it's the **greatest** one (as in the biggest number according to semver) but not the **latest** one (as in the one tagged with the `latest` dist-tag). We need to make such distinction to fully understand what will happen after that.

So, when you run `npm view test-npm-update`, it actually runs `npm view test-npm-update@latest`, meaning it will grab the informations of the **latest** version. But maybe some other versions have been released with a custom tag after this one. For me, so far, so good. NPM is doing exactly what I would expect. If I want a custom release such as the canary one, I can run `npm view test-npm-update@canary` and it will display infos about the `1.0.2` version. In fact, but I might be wrong but I except NPM to always use the **latest** version (aka the `latest` dist-tag) by default if I don't specify anything. That's what you can mostly read all over the NPM documentation.

But remember, `1.0.2` is inside the `versions` array just like any other version. So first warning, if you use such metadata for whatever stuff you are doing, do not assume that the **greatest** version inside the `versions` array is the **latest** one.

## Install

Now, what if I run `npm install test-npm-update`? What would you expect to be installed? `1.0.1`right? And of course it will be this version, the **latest** one. That's normal, after all, **latest** is the default one. All good here.

What if I clean my folder and then run `npm install test-npm-update@^1.0.0`? Guess what, `1.0.1` will be installed. And I'm totally ok with that. I asked for the best 1.x.x version and I'm glad to have the **latest** one since it matches.

## package.json

But most of the time, you don't install or update from command line, you have a `package.json` file with a range inside it. Let's say we have the following one:

```json
{
  "name": "awesome-project",
  "version": "0.0.0",
  "dependencies": {
    "test-npm-update": "^1.0.0"
  }
}
```

Pretty classic, right? Now, for the purpose of the demo, let's say we currently have the `1.0.0` version of `test-npm-update` locally installed. If you want to reproduce, just create an empty folder, then create a `package.json` inside it with the previous content and run `npm install test-npm-update@1.0.0` to force the install of an old version.

Done? Cool, let's move forward. NPM has a command to test if you have outdated versions locally installed. Which is our case. Let's check that by running `npm outdated`. You should have something like:

```
Package          Current  Wanted  Latest  Location
test-npm-update  1.0.0    1.0.2   1.0.1
```

Wait a minute? I'm ok with *current* (the locally installed) being `1.0.0` and *latest* (matching the dist-tag) being `1.0.1` but *wanted* is supposed to be the best matching version I should install according to `package.json`. How can it be greater than *latest*?

Actually, it's all ok according to the NPM documentation. After all, the `package.json` range is `^1.0.0` which means the greatest possible version without changing the first non-zero digit. And among **all** our versions (see the `versions` array from `npm view`), both `1.0.1` and `1.0.2` match this range, but since `1.0.2` is greater than `1.0.1`, the *wanted* version is `1.0.2`.

I didn't expect that to be honest. That's not wrong but I can't help myself finding that strange.

## Install again

Quick mention to the fact that if I run `npm install` with my `package.json` in an empty folder (aka without the `1.0.0` version already installed), it will still install `1.0.1` version. That's ok according to **latest** being the default one. Back to our outdated `1.0.0` version.

## Update

Things start to get really ugly now. So, `npm outdated` just told me I have an old local version. I should probably update it, and NPM has a command for that. Let's run `npm update`. To be honest, I wasn't sure anymore what would be installed locally. I mean, I would have normally expected the `1.0.1` version. My brain was like "It should be the greatest **stable** version which match the range", with **stable** meaning lower or equal to the `latest` tag, but for NPM, it's more like "It should be the greatest version which match the range. Period.". And it makes all the difference. My brain stops at `1.0.1` as the latest stable but NPM browse **all** version, including any custom dist-tags, including the `canary` version.

At the end, running `npm update` will install `1.0.2` version. This is **wrong**. According to [documentation](https://docs.npmjs.com/cli/update):

> This command will update all the packages listed to the latest version (specified by the tag config), respecting semver.

I read that as the **latest** version according to `latest` dist-tag. But we just updated to a version beyond this **latest** version. In any case, this is super dangerous! It means you can update to non-stable versions without even noticing it.

What if we didn't have the `1.0.0` already installed? Since `npm update` also install missing packages, it will indeed install `test-npm-update` according to `package.json` and, of course, to the `1.0.2` version.

## Conclusion

IMHO, I think this is way too dangerous, `npm update` should be capped by the **latest** version, and so should `npm outdated`. By default, no command should target versions beyond `latest` dist-tag. Also, it seems inconsistent to have `install` and `update` both capable of installing a missing package from a `package.json` file but not to the same version.

I raised an issue on [Github](https://github.com/npm/npm/issues/8476), we will see. Be careful from now on.

Thanks for reading! Spread the word.

## Personal ad

It might be a bit too early to speak about that, but if you need an `outdated` command which is actually capped by the `latest` tag and also support other package managers (like Bower), please check my [outdated](https://github.com/pauldijou/outdated) project. It's not ready at all yet but it will be in the next few days, promise.
