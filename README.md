# EmojMe

A set of tools to manage your slack emoji. Upload em, download em, download em from one and upload em to another. Get yourself some emoji related statistics. It's all here.

## Usage

```

  Usage: emojme [options]

Commands: (pick 1)
  download                 download all emoji from given subdomain
  upload                   upload source emoji to given subdomain
  add                      upload source emoji to given subdomain
  user-stats               get emoji statistics for given user on given subdomain
  sync                     get emoji statistics for given user on given subdomain

Options: (see below)
  -s, --subdomain [value]  [upload/add/download/user-stats/sync] slack subdomain. Can be specified multiple times, paired with respective token. (default: null)
  -t, --token [value]      [upload/add/download/user-stats/sync] slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains. (default: null)
  --src [value]            [upload, add] source file(s) for emoji json you'd like to upload (default: null)
  --name [value]           [add] name of the emoji from --src that you'd like to upload (default: null)
  --alias-for [value]      [add] name of the emoji you'd like --name to be an alias of. Specifying this will negate --src (default: null)
  --src-subdomain [value]  [sync] subdomain from which to draw emoji for one way sync (default: null)
  --src-token [value]      [sync] token with which to draw emoji for one way sync (default: null)
  --dst-subdomain [value]  [sync] subdomain to which to emoji will be added is one way sync (default: null)
  --dst-token [value]      [sync] token with which emoji will be added for one way sync (default: null)
  --save                   [download] create local files of the given subdomains emoji
  --user [value]           [download, user-stats] slack user you'd like to get stats on. Can be specified multiple times for multiple users. (default: null)
  --top [value]            [user-stats] the top n users you'd like user emoji statistics on (default: 10)
  --no-cache               [download/user-stats/sync] force a redownload of all cached info.
  -h, --help               output usage information
  -V, --version            output the version number
```

* `download`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * _optional_: `--save` will save actual emoji data, rather than just adminList json.
  * _optional_: `--user` will create an additional adminList of only $USER's emoji, and will `--save` only $USER's emoji if that option is supplied.
  * _optional_: `--no-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
* `upload`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * **requires** at least one `--src` source json file.
    * Src json should contain a list of objects where each object contains a "name" and "url" for image source
    * If adding an alias, url will be ignored and "is_alias" should be set to "1", and "alias_for" should be the name of the emoji to be aliased.
* `add`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * **requires** one of the following:
      1. `--src` path of local emoji file.
          * _optional_: `--name` name of the emoji being uploaded. If not provided, the file name will be used.
      1. `--name` and `--alias-for` to create an alias called `$NAME` with the same image as `$ALIAS-FOR`
  * Multiple `--src`'s or `--name`/`--alias-for` pairs may be provided, but don't mix the patterns. You'll confuse yourself.
* `user-stats`
  * **requires** at least one `--subdomain`/`--token` **auth pair**. Can accept multiple auth pairs.
  * With no optional parameters given, this will print the top 10 emoji contributors
  * _optional_: one of the following:
      1. `--top` will show the top $TOP emoji contributors
      1. `--user` will show statistics for $USER. Can accept multiple `--user` calls.
  * _optional_: `--no-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.
* `sync`
  * **requires** one of the following:
      1. at least **two** `--subdomain`/`--token` **auth pair**. Can accept more than two auth pairs.
      1. at least **one** `--src-subdomain`/`--src-token` auth pair and at least **one** `--dst-subdomain`/`--dst-token` auth pairs for "one way" syncing.
  * _optional_: `--no-cache` will force a redownload of emoji adminlist. If not supplied, a redownload is forced every  24 hours.

## Output

* Diagnostic info and intermediate results are written to the build directory. Some might come in handy!
* `build/$SUBDOMAIN.emojiUploadErrors.json` will give you a json of emoji that failed to upload and why. Use it to reattempt an upload! Generated from `upload` and `sync` calls.
* `build/$SUBDOMAIN.adminList.json` is the "master list" of a subdomain's emoji. Generated from `download` and `sync` calls.
* `build/$USER.$SUBDOMAIN.adminList.json` is all the emoji created by a user. Generated from `user-stats` calls.
* `build/diff.to-$SUBDOMAIN.from-$SUBDOMAINLIST.adminList.json` contains all emoji present in $SUBDOMAINLIST but not in $SUBDOMAIN. Generated from `sync` calls.

## Examples

#### Download all emoji from subdomain
```
./emojme.js download --subdomain $SUBDOMAIN --token $TOKEN
```

#### Download all emoji from multiple subdomains
```
./emojme.js download --subdomain $SUBDOMAIN --token $TOKEN --subdomain $SUBDOMAIN2 --token $TOKEN2
```

#### add $FILE as $NAME and $URL as $NAME2 to subdomain
```
./emojme.js add --subdomain $SUBDOMAIN --token $TOKEN --src $FILE --name $NAME --src $URL --name $NAME2
```

#### in $SUBDOMAIN1 and $SUBDOMAIN2, alias $ALIAS_FOR to $NAME
```
./emojme.js add --subdomain $SUBDOMAIN1 --token $TOKEN1 ---subdomain $SUBDOMAIN2 --token $TOKEN2 --alias-for '$ALIAS_FOR' --name '$NAME'
```

#### upload emoji from source json to subdomain
```
./emojme.js upload --subdomain $SUBDOMAIN --token $TOKEN --src './myfile.json'
```

#### upload emoji from source json to multiple subdomains
```
./emojme.js upload --subdomain $SUBDOMAIN --token $TOKEN --subdomain $SUBDOMAIN2 --token $TOKEN2 --src './myfile.json'
```

#### get user statistics for user $USER (emoji upload count, etc)
```
./emojme.js user-stats --subdomain $SUBDOMAIN --token $TOKEN --user $USER
```
* This will create json file ./build/$USER.$SUBDOMAIN.adminList.json

#### get user statistics for multiple users
```
./emojme.js user-stats --subdomain $SUBDOMAIN --token $TOKEN --user $USER --user $USER2 --user $USER3
```

#### get user statistics for top $N contributors
```
./emojme.js user-stats --subdomain $SUBDOMAIN --token $TOKEN --top $N
```

#### sync emoji so that $SUBDOMAIN1 and $SUBDOMAIN2 have the same emoji*
<sup>*the same emoji names, that is. If :hi: is different on the two subdomains they will remain different</sup>
```
./emojme.js sync --subdomain $SUBDOMAIN1 --token $TOKEN1 --subdomain $SUBDOMAIN2 --token $TOKEN2
```

#### sync emoji from $SUBDOMAIN1 to $SUBDOMAIN2
```
./emojme.js sync --src-subdomain $SUBDOMAIN1 --src-token $TOKEN1 --dst-subdomain $SUBDOMAIN2 --dst-token $TOKEN2
```

#### download source content for emoji made by $USER1 and $USER2 in $SUBDOMAIN
```
./emojme.js download --save --subdomain $SUBDOMAIN --token $TOKEN --user USER1 --user USER2
```
* This will create directories ./build/$SUBDOMAIN/$USER1 and ./build/$SUBDOMAIN/$USER2, each containing that user's emoji

## Extra maybe helpful commands

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

## Todo

* [ ] the two existing classes "EmojiAdd" and "EmojiAdminList" have nearly identical constructors. They should share a codebase.
* [ ] wow testing???
* [ ] gotta lint this woooow
