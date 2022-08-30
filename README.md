# [emojme](https://github.com/jackellenberger/emojme) - [Documentation](https://jackellenberger.github.io/emojme)

## Table of Contents
* [Project Overview](#what-it-is)
* [Breaking Changes](#breaking-changes)
    * [2.0.0](#2-0-0)
* [Requirements](#requirements)
* [Installation](#installation)
    * [Getting a slack token](#finding-a-slack-token)
    * [Getting a slack cookie](#finding-a-slack-cookie)
* [Usage](#usage)
    * [Command Line](#usage)
    * [Module](#module)
* [Build directory output](#build-directory-output)
* [A closer look at options](#a-closer-look-at-options)
* [Add vs Upload](#whats-the-difference-between-add-and-upload)
* [CLI Examples](#cli-examples)
    * [Download](#emojme-download)
    * [Add](#emojme-add)
    * [Upload](#emojme-upload)
    * [Sync](#emojme-sync)
    * [User Stats](#emojme-user-stats)
    * [Favorites](#emojme-favorites)
* [Pro Moves](#pro-moves-promoves)
    * [Rate Limiting](#rate-limiting-and-you)
    * [FAQ](#faq)
* [Other Projects of Note](#inspirations)

## What it is
Emojme is a set of tools to manage your Slack emoji, either directly from the command line or from within your own Javascript project.

Primary features are:
* Uploading new emoji
    * Individually, by passing a file or url
    * In bulk, by passing a json "adminList" or a yaml "emojipack" file
    * To one or many slack instances at once
* Download existing emoji
    * From one or many slack instances
    * Download all emoji
    * Download some emoji
* Sync emoji between mulitple slack instance
    * One to one, one to many, many to one, or many to many
* Analyze emoji authorship
    * Who makes the most emoji in your slack instance?
* Analyze emoji usage
    * Which emoji do you use most?

jsdocs are available at [https://jackellenberger.github.io/emojme](https://jackellenberger.github.io/emojme). Read em.

## Breaking Changes

### 2.0.0

Removes support for easy breazy beautiful user token auth, adds support for grumble grumble cookie token + cookie auth. Slack made me do it I swear. What does it mean for you?
- Whenever you wrote or used an emojme method with a signature like `method(domain, token, options)`, you will now need `method(domain, token, cookie, options)`.
- Whenever you were calling the CLI with a pattern like `emojme command --subdomain $SUBDOMAIN --token $TOKEN`, you will now need `emojme command --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE`.
- Read on for examples and instructions on how to collect your cookie from the jar.


## Requirements

To use emojme you don't need a bot or a workspace admin account. In fact, ~only regular [**user tokens**](https://api.slack.com/docs/token-types#user) work~ only *cookie* tokens work, in combination with shortlived browser tokens, and getting both isn't _quite_ as easy as getting other types of tokens. Limitations are:
* Cookie tokens can be grabbed from any logged in slack webpage by following [these instructions](#finding-a-slack-token).
* Auth Cookies are grabbed with even more difficulty, again from logged in slack pages, following [these instructions](#finding-a-slack-cookie).
* All actions taken through Emojme can be linked back to your user account. That might be bad, but no one has yelled at me yet.
* Cookie tokens are cycled at inditerminate times, and cannot (to my knowledge) be cycled manually. Ditto for the cookies themselves. **DO NOT LOSE CONTROL OF YOUR COOKIES**. Any project that uses emojme should have tokens passed in through environment variables and should not store them in source control.
  * Update July 2021: If you are have been using an automated system to scrape User Tokens, you are pretty much hosed. The cookies now required are [Http Only](https://owasp.org/www-community/HttpOnly) and can't be easily (or at all?) accessed via javascript.

## Installation

### Command Line

Via npm
```bash
$ (nvm use 10 || nvm install 10) && npm install emojme
$ npx emojme [command] [options]
```

Via github

```bash
$ git clone https://github.com/jackellenberger/emojme.git
$ cd emojme
$ node ./emojme [command] [options]
```

In order to use either feature, you will need both a Token and a Cookie each for every target subdomain (e.g. my-subdomain.slack.com). You can of course use your own methods for achieving this, but (and I will repeat this), the [Emojme: Emoji Anywhere](https://chrome.google.com/webstore/detail/emojme-emoji-anywhere/nbnaglaclijdfidbinlcnfdbikpbdkog?hl=en-US) Chrome Extension makes it very much easier than anything else, at only minor risk to your personal security. But hey if I were gonna steal your slack creds I'd do it in an alley with a knife or something, not in broad daylight. Its source is also [available on github](https://github.com/jackellenberger/emojme-emoji-anywhere) if you don't enjoy pre-rolls.

### Finding a slack token

Update July 2021: Slack has switched away from using questionably rotated user tokens to using "cookie tokens" and an associated short lived cookie. Smart, but we're smarter. User Tokens were of the format `xox[sp]-(\w{12}|\w{10})-(\w{12}|\w{11})-\w{12}-\w{64}` but *will no longer work*. If use see an auth error, this is probably the reason. Cookie tokens follow a similar form, but note the `c`: `xoxc-(\w{12}|\w{10})-(\w{12}|\w{11})-\w{12}-\w{64}`.

To extract the Slack token, run the following script in your devtools console while being logged into your Slack team:
```js
JSON.parse(localStorage.localConfig_v2).teams[document.location.pathname.match(/^\/client\/(T[A-Z0-9]+)/)[1]].token
```

#### Finding a slack cookie

As cookies are now required, so too is this section. Slack's auth cookie, as far as I can tell, is the `d` cookie, which is unfortunately HttpOnly meaning it cannot be accessed via javascript. It can, however, be accessed with a little creativity.

Chrome's (and presumably any modern browser's) cookies API does allow for HttpConly cookies to be accessed, but require the user's explicit approval but way of an extension. [Emojme: Emoji Anywhere](https://github.com/jackellenberger/emojme-emoji-anywhere) is such an extension, and is [available in the chrome web store](https://chrome.google.com/webstore/detail/emojme-emoji-anywhere/nbnaglaclijdfidbinlcnfdbikpbdkog?hl=en-US) (or of course can be loaded from source if you want to take your life in your own hands). Clicking the extension icon > `Get Slack Token and Cookie` will land you with what I am calling a "auth blob", which you can then pass to emojme via the `--auth-json` argument.

![So easy! So Fun! With just one chrome extension!](/images/emojme-chrome-extension.jpg)

You may also pull the `d` cookie with your fleshy human hands, if you so desire. Open up your browser's developer tools, then Application menu > Cookies > d, and copy the string out for yourself. With this method, it will be easier to specify individual `--subdomain --token --cookie` flags.

![I have an MFA in drawing with a mouse](/images/how-to-get-a-cookie.jpg)

## Usage

Emojme can be used either as a command line tool or as a node module to be mixed in with your existing projects.

Complete CLI flags can be found in [USAGe.md](USAGE.md), but each command takes the `--help` option.

### Module

In your project's directory
```bash
npm install --save emojme
```

In your project

```node
var emojme = require('emojme');

// emojme-download
var downloadOptions = {
  save: ['username_1', 'username_2'], // Download the emoji source files for these two users
  bustCache: true, // make sure this data is fresh
  output: true // download the adminList to ./build
};
var downloadResults = await emojme.download('mySubdomain', 'myToken', 'myCookie', downloadOptions);
console.log(downloadResults);
/*
  {
    mySubdomain: {
      emojiList: [
        { name: 'emoji-from-mySubdomain', ... },
        ...
      ],
      saveResults: [
        './build/mySubdomain/username_1/an_emoji.jpg',
        './build/mySubdomain/username_1/another_emoji.gif',
        ... all of username_1's emoji
        './build/mySubdomain/username_2/some_emoji.jpg',
        './build/mySubdomain/username_2/some_other_emoji.gif',
        ... all of username_2's emoji
      ]
    }
  }
*/

// emojme-upload
var uploadOptions = {
  src: './emoji-list.json', // upload all the emoji in this json array of objects
  avoidCollisions: true, // append '-1' or similar if we try to upload a dupe
  prefix: 'new-' // prepend every emoji in src with "new-", e.g. "emoji" becomes "new-emoji"
};
var uploadResults = await emojme.upload('mySubdomain', 'myToken', 'myCookie', uploadOptions);
console.log(uploadResults);
/*
  {
    mySubdomain: {
      collisions: [
        { name: an-emoji-that-already-exists-in-mySubdomain ... }
      ],
      emojiList: [
        { name: emoji-from-emoji-list-json ... },
        { name: emoji-from-emoji-list-json ... },
        ...
      ]
    }
  }
*/

// emojme-add
var addOptions = {
  src: ['./emoji1.jpg', 'http://example.com/emoji2.png'], // upload these two images
  name: ['myLocalEmoji', 'myOnlineEmoji'], // call them these two names
  bustCache: false, // don't bother redownloading existing emoji
  avoidCollisions: true, // if there are similarly named emoji, change my new emoji names
  output: false // don't write any files
};
var subdomains = ['mySubdomain1', 'mySubdomain2'] // can add one or multiple
var tokens = ['myToken1', 'myToken2'] // can add one or multiple
var addResults = await emojme.add(subdomains, tokens, addOptions);
console.log(addResults);
/*
  {
    mySubomain1: {
      collisions: [], // only defined if avoidCollisons = false
      emojiList: [
        { name: 'myLocalEmoji', ... },
        { name: 'myOnlineEmoji', ... },
      ]
    },
    mySubomain2: {
      collisions: [], // only defined if avoidCollisons = false
      emojiList: [
        { name: 'myLocalEmoji', ... },
        { name: 'myOnlineEmoji', ... },
      ]
    }
  }
*/

// emojme-sync
var syncOptions = {
  srcSubdomains: ['srcSubdomain'], // copy all emoji from srcSubdomain...
  srcTokens: ['srcToken'],
  dstSubdomains: ['dstSubdomain1', 'dstSubdomain2'], // ...to dstSubdomain1 and dstSubdomain2
  dstTokens: ['dstToken1', 'dstToken2'],
  bustCache: true // get fresh lists to make sure we're not doing more lifting than we have to
};
var syncResults = await emojme.sync(null, null, syncOptions);
console.log(syncResults);
/*
  {
    dstSubdomain1: {
      emojiList: [
        { name: emoji-1-from-srcSubdomain ... },
        { name: emoji-2-from-srcSubdomain ... }
      ]
    },
    dstSubdomain2: {
      emojiList: [
        { name: emoji-1-from-srcSubdomain ... },
        { name: emoji-2-from-srcSubdomain ... }
      ]
    }
  }
*/

//emojme-user-stats
var userStatsOptions = {
  user: ['username_1', 'username_2'] // get me some info on these two users
};
var userStatsResults = await emojme.userStats('mySubdomain', 'myToken', 'myCookie', userStatsOptions);
console.log(userStatsResults);
/*
  {
    mySubdomain: {
      userStatsResults: [
        {
          user: 'username_1',
          userEmoji: [{ all username_1's emoji }],
          subdomain: mySubdomain,
          originalCount: x,
          aliasCount: y,
          totalCount: x + y,
          percentage: (x + y) / mySubdomain's total emoji count
        },
        {
          user: 'username_2',
          userEmoji: [{ all username_2's emoji }],
          subdomain: mySubdomain,
          originalCount: x,
          aliasCount: y,
          totalCount: x + y,
          percentage: (x + y) / mySubdomain's total emoji count
        }
      ]
    }
  }
*/

//emojme-favorites
var favoritesResult = await emojme.favorites('mySubdomain', 'myToken', 'myCookie', {});
console.log(favoritesResult);
/*
  {
    mySubdomain: {
      favoritesResult: {
          user: '{myToken's user}',
          favoriteEmoji: [
             emojiName,
             ...
          ],
          favoriteEmojiAdminList: [
            {emojiName}: {adminList-style emoji object, with additional `usage` value}
            ...
          ],
        }
    }
  }
*/
```

## Build directory output

Okay you've run it, now what? Where are my dang emoji?

* Diagnostic info and intermediate results are written to the build directory. Some might come in handy!
* `build/$SUBDOMAIN.emojiUploadErrors.json` will give you a json of emoji that failed to upload and why. Use it to reattempt an upload! Generated from `upload` and `sync` calls.
* `build/$SUBDOMAIN.adminList.json` is the "master list" of a subdomain's emoji. Generated from `download` and `sync` calls.
* `build/$USER.$SUBDOMAIN.adminList.json` is all the emoji created by a user. Generated from `user-stats` calls.
* `build/diff.to-$SUBDOMAIN.from-$SUBDOMAINLIST.adminList.json` contains all emoji present in $SUBDOMAINLIST but not in $SUBDOMAIN. Generated from `sync` calls.


## A closer look at options
* Universal options:
  * **requires** at least one `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept multiple auth tuples.
    * exception: sync can use a source/destination pattern, see below.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.

* `download`
  * **requires** at least one `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept multiple auth tuples.
  * _optional_: `--save $user` will save actual emoji data for the specified user, rather than just adminList json. Find the emoji in ./build/subdomain/user/
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
  * _optional_: `--since timestamp` will only download or save emoji created after the epoch time timestamp given, e.g. `1572064302751`
* `upload`
  * **requires** at least one `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept multiple auth tuples.
  * **requires** at least one `--src` source json file.
    * Src json should contain a list of objects where each object contains a "name" and "url" for image source
    * Src yaml should contain an `emojis` key whose value is a list of emoji objects. Each object should contain `name` and `src` if an original emoji, or `name`, `is_alias: 1`, and `alias_for` if an alias.
    * If adding an alias, url will be ignored and "is_alias" should be set to "1", and "alias_for" should be the name of the emoji to be aliased.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
* `add`
  * **requires** at least one `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept multiple auth tuples.
  * **requires** one of the following:
      1. `--src` path of local emoji file.
          * _optional_: `--name` name of the emoji being uploaded. If not provided, the file name will be used.
      1. `--name` and `--alias-for` to create an alias called `$NAME` with the same image as `$ALIAS-FOR`
  * Multiple `--src`'s or `--name`/`--alias-for` pairs may be provided, but don't mix the patterns. You'll confuse yourself.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
* `user-stats`
  * **requires** at least one `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept multiple auth tuples.
  * With no optional parameters given, this will print the top 10 emoji contributors
  * _optional_: one of the following:
      1. `--top` will show the top $TOP emoji contributors
      1. `--user` will show statistics for $USER. Can accept multiple `--user` calls.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
  * _optional_: `--since timestamp` will count the author statistics of only those emoji created after the epoch time timestamp given, e.g. `1572064302751`
* `sync`
  * **requires** one of the following:
      1. at least **two** `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept more than two auth tuples.
      1. at least **one** `--src-subdomain`/`--src-token` auth tuple and at least **one** `--dst-subdomain`/`--dst-token` auth tuples for "one way" syncing.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
  * _optional_: `--since timestamp` will count the author statistics of only those emoji created after the epoch time timestamp given, e.g. `1572064302751`
  * _optional_: `--dry-run` download adminLists for all requested subdomains and diff them, but don't upload any new emoji. Find the diffs in `./output/to-$DST_SUBDOMAIN.from-$SRC_SUBDOMAIN.adminList.json`
* `favorites`
  * **requires** at least one `--subdomain`/`--token`/`--cookie` **auth tuple**. Can accept multiple auth tuples.
  * With no optional parameters given, this will print the token's user's 10 most used emoji
  * _optional_: `--top` _verbose cli usage only_ limits stdout to top N most used emoji
  * _optional_: `--usage` _verbose cli usage only_ prints not only the user's favorite emoji, but also the usage numbers.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist and boot data. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-output` will prevent writing of files in the ./build directory. It does not currently suppres stdout.


## What's the difference between `Add` and `Upload`?

Input type and use case! Technically (and behind the scenes) these commands do the same thing, which is post emoji to Slack.

The difference is that `Upload` is designed to take an `adminList` (what Slack calls a list of emoji and their related metadata) in the form of a json file. You can create this json file yourself, or use the `download` command to get it from an existing slack instance. It should be a Json array of objects, where each object represents an emoji and has attributes:
* `name` (the name of the emoji duh)
* `url` (the source content of the emoji. either a url, a file path, or a raw `data:` string)
* `is_alias` (either 0 for non-aliases or 1 for aliases)
* `alias_for` (name of the emoji to alias if the emoji being uploaded is an alias)
There are other fields in an adminList, but no others are used at the current time.

`Add` is designed to allow users to upload a single or few emoji, directly from the command line, without having to craft a json file before hand. You can create either new emojis or new aliases (but not both, for now). Each new emoji needs a `--src`, and can take a `--name`, otherwise the file name will be used. Each new alias takes a `--name` and the name of the original emoji to alias as `--alias-for`.

## CLI Examples

It should be noted that there are many ways to run this project. `npx emojme add` will work when emojme is present in `node_modules` (such as when downloaded via `npm`). `node ./emojme add` and `node ./emojme-add` will work if you have cloned the repo. These examples will use the former construction, but feel free to do whatever.

### emojme download

* Download all emoji from subdomain
  * `npx emojme download --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE`
  * creates `./build/$SUBDOMAIN.adminList.json` containing url references to all emoji, but not the files themselves.

* Download all emoji from subdomain using an authjson
  * `npx emojme download --auth-json '{"token":"$TOKEN","domain":"$SUBDOMAIN","cookie":"$COOKIE"}'`
  * creates `./build/$SUBDOMAIN.adminList.json` containing url references to all emoji, but not the files themselves.

* Download all emoji from multiple subdomains
  * `npx emojme download --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --subdomain $SUBDOMAIN2 --token $TOKEN2 --cookie $COOKIE2`
  * creates `./build/$SUBDOMAIN1.adminList.json` and `./build/$SUBDOMAIN2.adminList.json`

* download source content for emoji made by $USER1 and $USER2 in $SUBDOMAIN
  * `npx emojme download --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --save $USER1 --save $USER2`
  * This will create directories `./build/$SUBDOMAIN/$USER1/` and `./build/$SUBDOMAIN/$USER2/`, each containing that user's raw emoji image files

* download source content for all emoji in $SUBDOMAIN, grouping by user
  * `npx emojme download --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --save-all`
  * This will create directories `./build/$SUBDOMAIN/$USER/` for each user in $SUBDOMAIN that has created an emoji

### emojme add

* add $FILE as :$NAME: and $URL as :$NAME2: to subdomain
    * `npx emojme add --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --src $FILE --name $NAME --src $URL --name $NAME2`

* in $SUBDOMAIN1 and $SUBDOMAIN2, alias $ORIGINAL to $NAME
    * `npx emojme add --subdomain $SUBDOMAIN1 --token $TOKEN1 --cookie $COOKIE1 ---subdomain $SUBDOMAIN2 --token $TOKEN2 --cookie $COOKIE2 --alias-for '$ORIGINAL' --name '$NAME'`

* Alias :$ORIGINAL: as :$NAME:, and if :$NAME: exists, alias as :$NAME-1: instead
    * `npx emojme add --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --name $NAME --alias_for $ORIGINAL --avoid-collisions`
    * This has some amount of intelligence to it - if $ORIGINAL uses `_`'s, the alias will be `$ORIGINAL_1`, if the original has hyphens it will use hyphens, and if `-1` already exists it will use `-2`, etc.

### emojme upload

* upload emoji from source json to subdomain
    * `npx emojme upload --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --src './myfile.json'`

* upload emoji from source emojipacks yaml to subdomain
    * `npx emojme upload --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --src './emojipacks.yaml'`

* upload emoji from source json to multiple subdomains
    * `npx emojme upload --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --subdomain $SUBDOMAIN2 --token $TOKEN2 --cookie $COOKIE2 --src './myfile.json'`

* upload emoji from source json to subdomain, with each emoji being prefixed by $PREFIX
    * `npx emojme upload --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --src './myfile.json' --prefix '$PREFIX'`

* upload emoji from source json to subdomain, with each emoji being suffixed if it conficts with an existing emoji
    * `npx emojme upload --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --src './myfile.json' --avoid-collisions`

### emojme-sync

* sync emoji so that $SUBDOMAIN1 and $SUBDOMAIN2 have the same emoji*
    * <sup>*the same emoji names, that is. If :hi: is different on the two subdomains they will remain different</sup>
    * `npx emojme sync --subdomain $SUBDOMAIN1 --token $TOKEN1 --cookie $COOKIE1 --subdomain $SUBDOMAIN2 --token $TOKEN2 --cookie $COOKIE2`

* sync emoji so that $SUBDOMAIN1, $SUBDOMAIN2, and $SUBDOMAIN3 have the same emoji
    * `npx emojme sync --subdomain $SUBDOMAIN1 --token $TOKEN1 --cookie $COOKIE1 --subdomain $SUBDOMAIN2 --token $TOKEN2 --cookie $COOKIE2 --subdomain $SUBDOMAIN3 --token $TOKEN3 --cookie $COOKIE3`

* sync emoji from $SUBDOMAIN1 to $SUBDOMAIN2, so that $SUBDOMAIN1's emoji are a subset of $SUBDOMAIN2's emoji
    * `npx emojme sync --src-subdomain $SUBDOMAIN1 --src-token $TOKEN1 --dst-subdomain $SUBDOMAIN2 --dst-token $TOKEN2`

* sync emoji from $SUBDOMAIN1 to $SUBDOMAIN2 and $SUBDOMAIN3
    * `npx emojme sync --src-subdomain $SUBDOMAIN1 --src-token $TOKEN1 --dst-subdomain $SUBDOMAIN2 --dst-token $TOKEN2 --dst-subdomain $SUBDOMAIN3 --dst-token $TOKEN3`

* sync emoji from $SUBDOMAIN1 and $SUBDOMAIN2 to $SUBDOMAIN3
    * `npx emojme sync --src-subdomain $SUBDOMAIN1 --src-token $TOKEN1 --src-subdomain $SUBDOMAIN2 --src-token $TOKEN2 --dst-subdomain $SUBDOMAIN3 --dst-token $TOKEN3`

### emojme user stats

These commands all write files to the build directory, but become more immediately useful with the `--verbose` flag.

* get author statistics for user $USER (emoji upload count, etc)
    * `npx emojme user-stats --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --user $USER --verbose`
    * This will create json file `./build/$USER.$SUBDOMAIN.adminList.json`

* get user statistics for multiple users
    * `npx emojme user-stats --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --user $USER --user $USER2 --user $USER3`
    * This will create json files `./build/$USERX.$SUBDOMAIN.adminList.json` for each user passed

* get user statistics for top $N contributors
    * `npx emojme user-stats --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --top $N`
    * Defaults to top 10 users.

### emojme-favorites

* Print the token's user's top 20 most used emoji
    * `npx emojme favorites --subdomain $SUBDOMAIN1 --token $TOKEN1 --cookie $COOKIE1 --top 20 --verbose`

* Print the usage numbers for the user's top 10 most used emoji
    * `npx emojme favorites --subdomain $SUBDOMAIN1 --token $TOKEN1 --cookie $COOKIE1 --usage --verbose`


## Pro Moves :promoves:

### Creating a json file from a directory of images
You can use the script below to create a json file that will include all images in a directory. Make sure your directory only has files that end in gif, png, jpg, or jpeg. It will output a file called `emoji.json`.

```
brew install jq
./create-json.sh $PATH
```


### Getting a list of single attributes from an adminList json:

Hey try this with $ATTRIBUTE of "url". You might need all those urls!

```
cat $ADMINLIST.json | jq '.[] | .["$ATTRIBUTE"]'
```

### Rate limiting and you

Slack [threatened to release](https://api.slack.com/changelog/2018-03-great-rate-limits) then [released](https://api.slack.com/docs/rate-limits) rate limiting rules across its new api endpoints, and the rollout has included their undocumented endpoints now as well. As such, Emojme is going to slow down :capysad: Another nail in the coffin of making this a useful slackbot.

Though it is unpublished, I have on good authority that `/emoji.adminList` is Tier 3 (when paginated) and `/emoji.add` is Tier 2, so emojme now has a "fast part" and a "slow part" respectively.

I'm not one to judge how a person uses their own credentials, so there is a work around for those looking to get a bit more personal with the Slack networking infra team; Use the following environment variables to override my conservative defaults:
```sh
# How many requests to make at a time. Higher numbers are faster (as long as the other two params allow) and more prone to trip Slack's "hey that's not a burst that's a malicous user" alarm
SLACK_REQUEST_CONCURRENCY
# How many requests are to be sent per unit time. This is the real control of speed, the higher the more likely you are to be rate limited.
SLACK_REQUEST_RATE
# The unit of time, in ms. The lower the number the faster.
SLACK_REQUEST_WINDOW

# So, an example that has 10 in-flight requests at a time at a maximum rate of 200 requests per minute would be:
SLACK_REQUEST_CONCURRENCY=10 \
SLACK_REQUEST_RATE=200 \
SLACK_REQUEST_WINDOW=60000 \
node emojme-download --subdomain $SUBDOMAIN --token $TOKEN --cookie $COOKIE --save-all --bust-cache
```

I have tried my darndest to make the slack client in this project 429 tolerant, but after a few ignored 429's Slack gets mean and says you can't try again, so have fun dealing with that.

### FAQ

* I'm getting `invalid_auth` errors? huh???
  * See #60. Essentially, Slack has gotten wise to our whole "you can use a token for arbitrary lengths of time because Slack doesn't want to rotate them often and log us out of active sessions, or deal with zombie sessions that are authed with out of date tokens". They've switched from using User Tokens (xoxs-) to Cookie Tokens (xoxc-), in combination with a cookie that is shortlived. Very clever, but we are more cleverer. We'll just rip off that cookie and pass it through the same way we were doing the token. It'll be a pain, but only as insecure as it was before.

* I don't see any progress when I run a cli command
  * Do you have `--verbose` in your command? that's pretty useful.

* My network requests are slow and jerky
  * That's how we gotta live under [rate limiting](#rate-limiting-and-you). To speed things up, try the env vars that are listed, but things might not go well. To make things less jerkey, knock down the concurrency so requests are more serial and there is no down time between bursts.

* I just want to upload this thing fast, but I have to download 20k emoji to upload one?
  * Nope! That is the normal behavior to not anger slack - we do more easy GET's to avoid some troublesome POSTs, but you can turn that off. Just add `--allow-collisions` (or `{collsions: true}`) to your upload request.

## Contributing

Contribute! I'm garbo at js (and it's js's fault), so feel free to jump inand clean up, add features, and make the project live. I would recommend:

* Add tests
* Make your change
* Run tests `npm run test` or `npm run test:unit && npm run test:integration`
  * pro move: add a `debugger;` and use `it.only`, then `npm inspect node_modules/mocha/bin/_mocha spec/...` to debug a failing test.
* Run end to end tests (requires a real slack instance) `npm run test:e2e -- --subdomain $YOUR_REAL_SUBDOMAIN --token $YOUR_REAL_TOKEN`
* Lint
* Regenerate docs, if necessary

## Inspirations
* [emojipacks](https://github.com/lambtron/emojipacks) is my OG. It mostly worked but seems rather undermaintained.
* [neutral-face-emoji-tools](https://github.com/Fauntleroy/neutral-face-emoji-tools) is a fantastic tool that has enabled me to make enough emoji that this tool became necessary.

## Stupid ways to use this stupid library!
* https://github.com/jackellenberger/allmyemojichildren
* https://github.com/guyfedwards/emoji
* https://github.com/jackellenberger/emojme-hubot-plugin
* https://github.com/jackellenberger/emojme-emoji-anywhere
* https://github.com/jackellenberger/infinite-emoji-discord-bot
