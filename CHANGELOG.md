# Unreleased
* Rework logging to be less noisy and more organized.
   * Use Winston
   * log warning and worse to the console
   * log everything to log/combined.log
* Fix bug related to incorrect upload summary output

# 1.4.0
* Revamp download
  * `--save` can no longer be called with 'all' (but that never worked)
  * `--save-all-by-user` added to save all emoji by all users into build/$subdomain/$user
  * `--save-all` added to save all emoji to build/$subdomain
* Add jsdoc documentation, available at https://jackellenberger.github.io/emojme
* Configure circle ci
* Clarify what a user token should look like

# 1.3.3
* Fix bug preventing correct package contents from being uploaded to npm
* Fix bug preventing empty slack instances from adding and syncing emoji

# 1.3.2
* Add keywords, bin, etc to package.json
* Add module usage instructions to readme


# 1.3.1
* Create CHANGELOG.md
* Allow certain required `Add` params to be nulled out by providing an empty string
  * For example, `add --src 'source.jpg' --name ''` will act identically to `add --src 'source.jpg'`
  * This resolves an issue where adding multiple emoji of different shapes (i.e. new vs alias vs default named new) could become misaligned
* Add emojiList to output of `user-stats` for consistency and ease of use
* Add `<action>Cli` methods to ease testing.
* Resolve issue where repeated invocation of cli from a single process could pollute commander args
