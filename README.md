# EmojMe

A set of tools to manage your slack emoji. Upload em, download em, download em from one and upload em to another. Get yourself some emoji related statistics. It's all here.

## Usage

```
  Usage: emojme [options]

  Options:

    download                 download all emoji from given subdomain
    upload                   upload source emoji to given subdomain
    user-stats               get emoji statistics for given user on given subdomain
    sync                     get emoji statistics for given user on given subdomain
    -s, --subdomain [value]  [upload/download/user-stats/sync] slack subdomain. Can be specified multiple times, paired with respective token. (default: null)
    -t, --token [value]      [upload/download/user-stats/sync] slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains. (default: null)
    --src [value]            [upload] source file(s) for emoji json you'd like to upload (default: null)
    --src-subdomain [value]  [sync] subdomain from which to draw emoji for one way sync (default: null)
    --src-token [value]      [sync] token with which to draw emoji for one way sync (default: null)
    --dst-subdomain [value]  [sync] subdomain to which to emoji will be added is one way sync (default: null)
    --dst-token [value]      [sync] token with which emoji will be added for one way sync (default: null)
    --user [value]           [download, user-stats] slack user you'd like to get stats on. Can be specified multiple times for multiple users. (default: null)
    --top [value]            [user-stats] the top n users you'd like user emoji statistics on (default: 10)
    --save                   [download] create local files of the given subdomains emoji
    --no-cache               [upload/download/user-stats/sync] force a redownload of all cached info.
    -h, --help               output usage information
    -V, --version            output the version number
```

* Pick any one of [download, upload, user-stats, sync], and provide one or several (subdomain, token) pairs.
* For upload, provide a subdomain, token, and src json file
    * Src json should contain a list of objects where each object contains a "name" and "url" for image source
    * If adding an alias, url will be ignored and "is_alias" should be set to "1", and "alias_for" should be the name of the emoji to be aliased.
* For user-stats, provide one or several users to get stats on, or give the number of top n emoji contributors.
* For sync, provide either at least two subdomain, token pairs, or a --src-subdomain, --src-token pair and a --dst-subdomain --dst-token pair.
    * All subdomains will be updated to have all emoji from all subdomains given if no from and to are specified.
    * If src and dst subdomains are provided, all emoji from the src subdomain will be uploaded to the to subdomain.
    * No emoji will ever be overwritten.
* If for any reason you do not want to use a "cached" version of an emoji list, provide the --no-cache option to force a redownload. Otherwise, data will be redownloaded after 24 hours of staleness.

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

#### Extra maybe helpful commands
* Getting a list of single attributes from an adminList json:
```
cat $ADMINLIST.json | jq '.[] | .["$ATTRIBUTE"]'
```

## Finding a slack token

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
* [ ] Something about the upload logic is off - we get every emoji data downloaded before we ever start uploading.


