# [emojme](https://jackellenberger.github.io/emojme)

A set of tools to manage your Slack emoji, either directly from the command line or in your own project. Upload em, download em, download em from one and upload em to another. Get yourself some emoji related statistics. It's all here.

jsdocs are available at [https://jackellenberger.github.io/emojme](https://jackellenberger.github.io/emojme). Read em.

## Requirements

To use emojme you don't need a bot or a workspace admin account. In fact, only regular [**user tokens**](https://api.slack.com/docs/token-types#user) work, and getting one isn't _quite_ as easy as getting other types of tokens. Limitations are:
* User tokens can be grabbed from any logged in slack webpage by following [these instructions](#finding-a-slack-token).
* All actions taken through Emojme can be linked back to your user account. That might be bad, but no one has yelled at me yet.
* User tokens are cycled at inditerminate times, and cannot (to my knowledge) be cycled manually. **DO NOT LOSE CONTROL OF YOUR USER TOKEN**. Any project that uses emojme should have tokens passed in through environment variables and should not store them in source control.

## Usage

### Command Line

* In your shell

```
nvm use 10 || nvm install 10
npm install
```
* Also in your shell

```
Usage: emojme [command] [options]

Commands: (pick 1)
  download                 download all emoji from given subdomain to json
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token. (default: )
      -t, --token <value>      slack user token. ususaly starts xox*-... Can be specified multiple times, paired with respective subdomains. (default: )
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files in build/ and log/
      --verbose                log debug messages to console
      --save <user>            save all of <user>'s emoji to disk at build/$subdomain/$user
      --save-all               save all emoji from all users to disk at build/$subdomain
      --save-all-by-user       save all emoji from all users to disk at build/$subdomain/$user
      -h, --help               output usage information

  upload                   upload emoji from json to given subdomain
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xox*-... Can be specified multiple times, paired with respective subdomains.
      --src <value>            source file(s) for emoji json or yaml you'd like to upload
      --avoid-collisions       instead of culling collisions, rename the emoji to be uploaded "intelligently"
      --prefix <value>         prefix all emoji to be uploaded with <value>
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  add                      add single or few emoji to subdomain
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xox*-... Can be specified multiple times, paired with respective subdomains.
      --src <value>            source image/gif/#content for emoji you'd like to upload
      --name <value>           name of the emoji from --src that you'd like to upload
      --alias-for <value>      name of the emoji you'd like --name to be an alias of. Specifying this will negate --src
      --avoid-collisions       instead of culling collisions, rename the emoji to be uploaded "intelligently"
      --prefix <value>         prefix all emoji to be uploaded with <value>
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  user-stats               get emoji statistics for given user on given subdomain
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xox*-... Can be specified multiple times, paired with respective subdomains.
      --user <value>           slack user you'd like to get stats on. Can be specified multiple times for multiple users.
      --top <value>            the top n users you'd like user emoji statistics on
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  sync                     transfer emoji from one subdomain to another, and optionally vice versa
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xox*-... Can be specified multiple times, paired with respective subdomains.
      --src-subdomain [value]  subdomain from which to draw emoji for one way sync
      --src-token [value]      token with which to draw emoji for one way sync
      --dst-subdomain [value]  subdomain to which to emoji will be added is one way sync
      --dst-token [value]      token with which emoji will be added for one way sync
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  help [command]           get command specific help
```

* Universal options:
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
    * exception: sync can use a source/destination pattern, see below.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-ouptut` will prevent writing of files in the ./build directory. It does not currently suppres stdout.

* `download`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * _optional_: `--save $user` will save actual emoji data for the specified user, rather than just adminList json. Find the emoji in ./build/subdomain/user/
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-ouptut` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
* `upload`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * **requires** at least one `--src` source json file.
    * Src json should contain a list of objects where each object contains a "name" and "url" for image source
    * Src yaml should contain an `emojis` key whose value is a list of emoji objects. Each object should contain `name` and `src` if an original emoji, or `name`, `is_alias: 1`, and `alias_for` if an alias.
    * If adding an alias, url will be ignored and "is_alias" should be set to "1", and "alias_for" should be the name of the emoji to be aliased.
  * _optional_: `--no-ouptut` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
* `add`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * **requires** one of the following:
      1. `--src` path of local emoji file.
          * _optional_: `--name` name of the emoji being uploaded. If not provided, the file name will be used.
      1. `--name` and `--alias-for` to create an alias called `$NAME` with the same image as `$ALIAS-FOR`
  * Multiple `--src`'s or `--name`/`--alias-for` pairs may be provided, but don't mix the patterns. You'll confuse yourself.
  * _optional_: `--no-ouptut` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
* `user-stats`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * With no optional parameters given, this will print the top 10 emoji contributors
  * _optional_: one of the following:
      1. `--top` will show the top $TOP emoji contributors
      1. `--user` will show statistics for $USER. Can accept multiple `--user` calls.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-ouptut` will prevent writing of files in the ./build directory. It does not currently suppres stdout.
* `sync`
  * **requires** one of the following:
      1. at least **two** `--subdomain`/`--token` **auth pair**. Can accept more than two auth pairs.
      1. at least **one** `--src-subdomain`/`--src-token` auth pair and at least **one** `--dst-subdomain`/`--dst-token` auth pairs for "one way" syncing.
  * _optional_: `--bust-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
  * _optional_: `--no-ouptut` will prevent writing of files in the ./build directory. It does not currently suppres stdout.



### Module

* In your shell
  ```bash
  npm install --save emojme
  ```

* In your project

  ```node
    var emojme = requre('emojme');

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

    // emojme-download
    var downloadOptions = {
      save: ['username_1', 'username_2'], // Download the emoji source files for these two users
      bustCache: true, // make sure this data is fresh
      output: true // download the adminList to ./build
    };
    var downloadResults = await emojme.download('mySubdomain', 'myToken', downloadOptions);
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

    // emojme-upload
    var uploadOptions = {
      src: './emoji-list.json', // upload all the emoji in this json array of objects
      avoidCollisions: true, // append '-1' or similar if we try to upload a dupe
      prefix: 'new-' // prepend every emoji in src with "new-", e.g. "emoji" becomes "new-emoji"
    };
    var uploadResults = await emojme.upload('mySubdomain', 'myToken', uploadOptions);
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

    //emojme-user-stats
    var userStatsOptions = {
      user: ['username_1', 'username_2'] // get me some info on these two users
    };
    var userStatsResults = await emojme.userStats('mySubdomain', 'myToken', userStatsOptions);
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
  ```


## What's the difference between `Add` and `Upload`?

Input type and use case! Technically (and behind the scenes) these commands do the same thing, which is post emoji to Slack.

The difference is that `Upload` is designed to take an `adminList` (what Slack calls a list of emoji and their related metadata) in the form of a json file. You can create this json file yourself, or use the `download` command to get it from an existing slack instance. It should be a Json array of objects, where each object represents an emoji and has attributes:
* `name` (the name of the emoji duh)
* `url` (the source content of the emoji. either a url, a file path, or a raw `data:` string)
* `is_alias` (either 0 for non-aliases or 1 for aliases)
* `alias_for` (name of the emoji to alias if the emoji being uploaded is an alias)
There are other fields in an adminList, but no others are used at the current time.

`Add` is designed to allow users to upload a single or few emoji, directly from the command line, without having to craft a json file before hand. You can create either new emojis or new aliases (but not both, for now). Each new emoji needs a `--src`, and can take a `--name`, otherwise the file name will be used. Each new alias takes a `--name` and the name of the original emoji to alias as `--alias-for`.

## Build directory output

* Diagnostic info and intermediate results are written to the build directory. Some might come in handy!
* `build/$SUBDOMAIN.emojiUploadErrors.json` will give you a json of emoji that failed to upload and why. Use it to reattempt an upload! Generated from `upload` and `sync` calls.
* `build/$SUBDOMAIN.adminList.json` is the "master list" of a subdomain's emoji. Generated from `download` and `sync` calls.
* `build/$USER.$SUBDOMAIN.adminList.json` is all the emoji created by a user. Generated from `user-stats` calls.
* `build/diff.to-$SUBDOMAIN.from-$SUBDOMAINLIST.adminList.json` contains all emoji present in $SUBDOMAINLIST but not in $SUBDOMAIN. Generated from `sync` calls.

## Cli Examples

### Download

* Download all emoji from subdomain
```
./emojme.js download --subdomain $SUBDOMAIN --token $TOKEN
```

* Download all emoji from multiple subdomains
```
./emojme.js download --subdomain $SUBDOMAIN --token $TOKEN --subdomain $SUBDOMAIN2 --token $TOKEN2
```

* download source content for emoji made by $USER1 and $USER2 in $SUBDOMAIN
```
./emojme.js download --subdomain $SUBDOMAIN --token $TOKEN --save USER1 --save USER2
```
* This will create directories ./build/$SUBDOMAIN/$USER1 and ./build/$SUBDOMAIN/$USER2, each containing that user's emoji

### Add

* add $FILE as :$NAME: and $URL as :$NAME2: to subdomain
```
./emojme.js add --subdomain $SUBDOMAIN --token $TOKEN --src $FILE --name $NAME --src $URL --name $NAME2
```

* in $SUBDOMAIN1 and $SUBDOMAIN2, alias $ALIAS_FOR to $NAME
```
./emojme.js add --subdomain $SUBDOMAIN1 --token $TOKEN1 ---subdomain $SUBDOMAIN2 --token $TOKEN2 --alias-for '$ALIAS_FOR' --name '$NAME'
```

* Alias :$ORIGINAL: as :$NAME:, and if :$NAME: exists, alias as :$NAME-1: instead
```
./emojme.js add --subdomain $SUBDOMAIN --token $TOKEN --name $NAME --alias_for $ORIGINAL --avoid-collisions
```

### Upload

* upload emoji from source json to subdomain
```
./emojme.js upload --subdomain $SUBDOMAIN --token $TOKEN --src './myfile.json'
```

* upload emoji from source json to multiple subdomains
```
./emojme.js upload --subdomain $SUBDOMAIN --token $TOKEN --subdomain $SUBDOMAIN2 --token $TOKEN2 --src './myfile.json'
```

* upload emoji from source json to multiple subdomains
```
./emojme.js upload --subdomain $SUBDOMAIN --token $TOKEN --subdomain $SUBDOMAIN2 --token $TOKEN2 --src './myfile.json'
```

* upload emoji from source json to subdomain, with each emoji being prefixed by $PREFIX
```
./emojme.js upload --subdomain $SUBDOMAIN --token $TOKEN --src './myfile.json' --prefix '$PREFIX'
```

### User Stats

* get user statistics for user $USER (emoji upload count, etc)
```
./emojme.js user-stats --subdomain $SUBDOMAIN --token $TOKEN --user $USER
```
    * This will create json file ./build/$USER.$SUBDOMAIN.adminList.json

* get user statistics for multiple users
```
./emojme.js user-stats --subdomain $SUBDOMAIN --token $TOKEN --user $USER --user $USER2 --user $USER3
```

* get user statistics for top $N contributors
```
./emojme.js user-stats --subdomain $SUBDOMAIN --token $TOKEN --top $N
```

### Sync

* sync emoji so that $SUBDOMAIN1 and $SUBDOMAIN2 have the same emoji*

<sup>*the same emoji names, that is. If :hi: is different on the two subdomains they will remain different</sup>
```
./emojme.js sync --subdomain $SUBDOMAIN1 --token $TOKEN1 --subdomain $SUBDOMAIN2 --token $TOKEN2
```

* sync emoji from $SUBDOMAIN1 to $SUBDOMAIN2
```
./emojme.js sync --src-subdomain $SUBDOMAIN1 --src-token $TOKEN1 --dst-subdomain $SUBDOMAIN2 --dst-token $TOKEN2
```

## Pro Moves :promoves:

### Getting a list of single attributes from an adminList json:

Hey try this with $ATTRIBUTE of "url". You might need all those urls!

```
cat $ADMINLIST.json | jq '.[] | .["$ATTRIBUTE"]'
```

### Finding a slack token

From what I can tell these last anywhere from a few days to indefinitely. Currently, user tokens follow the format:
`xox[sp]-(\w{12}|\w{10})-(\w{12}|\w{11})-\w{12}-\w{64}` but admittedly I have a small sample size.

#### Slack for Web

It's easyish! Open and sign into the slack customization page, e.g. subdomain.slack.com/customization, right click anywhere > inspect element. Open the console and paste:
```
window.prompt("your api token is: ", TS.boot_data.api_token)
```
You will be prompted with your api token! 

<details>
  This is a departure from previous releases of the slack front end, wherein a token would be available on any page. Currently on /messages pages, only "client" tokens are available of the form `xoxc-...`. These are undocumented and are unable to be used to create emoji at the current time. 
 
Client tokens are accessible on the /messages page by running the following:
```
window.slackDebug.localConfig.getLocalConfigForTeamByKey(
    window.slackDebug.localConfig.getLocalConfigByKey('lastActiveTeamId'),
    'token'
);
```
(Thanks @curtisgibby!)
</details>

#### Slack for Desktop (Deprecated?)

This is a similar process, but requires an extra step depending on your platform.
* OSX: run or add to your .bashrc: `export SLACK_DEVELOPER_MENU=true; open -a /Applications/Slack.app`
* Windows: create a shortcut: `C:\Windows\System32\cmd.exe /c " SET SLACK_DEVELOPER_MENU=TRUE && start C:\existing\path\to\slack.exe"`
* Linux: honestly probably the same as OSX :shrug:

With that done and slack open, open View > Developer > Toggle Webapp DevTools (shortcut `super+option+i`). This will give you a chromium inspector into which you can paste
```
console.log(window.boot_data.api_token)
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
./emojme.js download --subdomain $SUBDOMAIN --token $TOKEN --save-all --bust-cache

```
I have tried my darndest to make the slack client in this project 429 tolerant, but after a few ignored 429's Slack gets mean and says you can't try again, so have fun dealing with that.

### FAQ

* I don't see any progress when I run a cli command
  * Do you have `--verbose` in your command? that's pretty useful.

* My network requests are slow and jerky
  * That's how we gotta live under [rate limiting](#rate-limiting-and-you). To speed things up, try the env vars that are listed, but things might not go well. To make things less jerkey, knock down the concurrency so requests are more serial and there is no down time between bursts.

## Inspirations
* [emojipacks](https://github.com/lambtron/emojipacks) is my OG. It mostly worked but seems rather undermaintained.
* [neutral-face-emoji-tools](https://github.com/Fauntleroy/neutral-face-emoji-tools) is a fantastic tool that has enabled me to make enough emoji that this tool became necessary.

## Stupid ways to use this stupid library!
* https://github.com/jackellenberger/allmyemojichildren
* https://github.com/guyfedwards/emoji
* https://github.com/jackellenberger/emojme-hubot-plugin
