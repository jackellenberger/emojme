# Slack Emoji Tools

A set of tools to manage your emoji. Upload em, download em, download em from one and upload em to another. Get yourself some emoji related statistics. It's all here.

## Usage

```
Usage: emoji [options]

Options:

download                 download all emoji from given subdomain
upload                   upload source emoji to given subdomain
user-stats               get emoji statistics for given user on given subdomain
sync                     get emoji statistics for given user on given subdomain
-s, --subdomain [value]  slack subdomain. Can be specified multiple times, paired with respective token. (default: null)
-t, --token [value]      slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains. (default: null)
--user [value]           slack user you'd like to get stats on. Can be specified multiple times for multiple users. (default: null)
--top [value]            the top n users you'd like user emoji statistics on (default: 10)
--src [value]            source file for emoji json you'd like to upload
--no-cache               force a redownload of all cached info.
-h, --help               output usage information
-V, --version            output the version number
```

* Pick any one of [download, upload, user-stats, sync], and provide one or several (subdomain, token) pairs.
* For upload, provide a subdomain, token, and src json file
    * Src json should contain a list of objects where each object contains a "name" and "url" for image source
    * If adding an alias, url will be ignored and "is_alias" should be set to "1", and "alias_for" should be the name of the emoji to be aliased.
* For user-stats, provide one or several users to get stats on, or give the number of top n emoji contributors.
* For sync, provide either at least two subdomain, token pairs, or a --from-subdomain, --from-token pair and a --to-subdomain --to-token pair.
    * All subdomains will be updated to have all emoji from all subdomains given if no from and to are specified.
    * If from and to subdomains are provided, all emoji fromt the from subdomain will be uploaded to the to subdomain.
    * No emoji will ever be overwritten.
* If for any reason you do not want to use a "cached" version of an emoji list, provide the --no-cache option to force a redownload. Otherwise, data will be redownloaded after 24 hours of staleness.

## Output

* Diagnostic info and intermediate results are written to the build directory. Some might come in handy!

## Examples

#### Download all emoji from subdomain
`./emoji.js download --subdomain <subdomain> --token <token>`

#### Download all emoji from multiple subdomains
`./emoji.js download --subdomain <subdomain> --token <token> --subdomain <subdomain2> --token <token2>`

#### upload emoji from source json to subdomain
`./emoji.js download --subdomain <subdomain> --token <token> --subdomain <subdomain2> --token <token2>`

## Finding a slack token

## Inspirations
* [emojipacks](https://github.com/lambtron/emojipacks) is my OG. It mostly worked but seems rather undermaintained.
* [neutral-face-emoji-tools](https://github.com/Fauntleroy/neutral-face-emoji-tools) is a fantastic tool that has enabled me to make enough emoji that this tool became necessary.

## Todo

* [ ] the two existing classes "EmojiAdd" and "EmojiAdminList" have nearly identical constructors. They should share a codebase.
* [ ] wow testing???
* [ ] gotta lint this woooow


