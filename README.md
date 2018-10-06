# EmojMe

A set of tools to manage your Slack emoji. Upload em, download em, download em from one and upload em to another. Get yourself some emoji related statistics. It's all here.

### Installation Requirements
```
nvm use 10 || nvm install 10
npm install
```

## Cli Usage

```

Usage: emojme [command] [options]

Commands: (pick 1)
  download                 download all emoji from given subdomain to json
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.
      --save <user>            save all of <user>'s emoji to disk. specify "all" to save all emoji.
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  upload                   upload emoji from json to given subdomain
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.
      --src <value>            source file(s) for emoji json you'd like to upload
      --avoid-collisions       instead of culling collisions, rename the emoji to be uploaded "intelligently"
      --prefix <value>         prefix all emoji to be uploaded with <value>
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  add                      add single or few emoji to subdomain
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.
      --src <value>            source image/gif/#content for emoji you'd like to upload
      --name <value>           name of the emoji from --src that you'd like to upload
      --alias-for <value>      name of the emoji you'd like --name to be an alias of. Specifying this will negate --src
      --avoid-collisions       instead of culling collisions, rename the emoji to be uploaded "intelligently"
      --prefix <value>         prefix all emoji to be uploaded with <value>
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  user-stats               get emoji statistics for given user on given subdomain
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.
      --user <value>           slack user you'd like to get stats on. Can be specified multiple times for multiple users.
      --top <value>            the top n users you'd like user emoji statistics on
      --bust-cache             force a redownload of all cached info.
      --no-output              prevent writing of files.

  sync                     transfer emoji from one subdomain to another, and optionally vice versa
      -s, --subdomain <value>  slack subdomain. Can be specified multiple times, paired with respective token.
      -t, --token <value>      slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.
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


### What's the difference between `Add` and `Upload`?

Input type and use case! Technically (and behind the scenes) these commands do the same thing, which is post emoji to Slack.

The difference is that `Upload` is designed to take an `adminList` (what Slack calls a list of emoji and their related metadata) in the form of a json file. You can create this json file yourself, or use the `download` command to get it from an existing slack instance. It should be a Json array of objects, where each object represents an emoji and has attributes:
* `name` (the name of the emoji duh)
* `url` (the source content of the emoji. either a url, a file path, or a raw `data:` string)
* `is_alias` (either 0 for non-aliases or 1 for aliases)
* `alias_for` (name of the emoji to alias if the emoji being uploaded is an alias)
There are other fields in an adminList, but no others are used at the current time.

`Add` is designed to allow users to upload a single or few emoji, directly from the command line, without having to craft a json file before hand. You can create either new emojis or new aliases (but not both, for now). Each new emoji needs a `--src`, and can take a `--name`, otherwise the file name will be used. Each new alias takes a `--name` and the name of the original emoji to alias as `--alias-for`.

## Module usage

Coming soon?

## Output

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

## Extra maybe helpful pro moves commands

### Getting a list of single attributes from an adminList json:

Hey try this with $ATTRIBUTE of "url". You might need all those urls!

```
cat $ADMINLIST.json | jq '.[] | .["$ATTRIBUTE"]'
```

### Finding a slack token

It's easy! Open any signed in slack window, e.g. subdomain.slack.com/messages, right click anywhere > inspect element. Open the console and paste:
```
window.prompt("your api token is: ",/api_token: "(.*)"/.exec(document.body.innerHTML)[1])
```
You will be prompted with your api token! From what I can tell these last anywhere from a few days to indefinitely. Currently, user tokens follow the format:
`xoxs-(\w{12}|\w{10})-(\w{12}|\w{11})-\w{12}-\w{64}` but admittedly I have a small sample size.

## Inspirations
* [emojipacks](https://github.com/lambtron/emojipacks) is my OG. It mostly worked but seems rather undermaintained.
* [neutral-face-emoji-tools](https://github.com/Fauntleroy/neutral-face-emoji-tools) is a fantastic tool that has enabled me to make enough emoji that this tool became necessary.

## Stupid ways to use this stupid library!
* https://github.com/jackellenberger/allmyemojichildren

## Todo

* [ ] gotta lint this woooow
* [ ] package and release
* [ ] add option to override stdout logger with custom logger
