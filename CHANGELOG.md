# 1.3.1
* Create CHANGELOG.md
* Allow certain required `Add` params to be nulled out by providing an empty string
  * For example, `add --src 'source.jpg' --name ''` will act identically to `add --src 'source.jpg'`
  * This resolves an issue where adding multiple emoji of different shapes (i.e. new vs alias vs default named new) could become misaligned
* Add emojiList to output of `user-stats` for consistency and ease of use
* Add `<action>Cli` methods to ease testing.
* Resolve issue where repeated invocation of cli from a single process could pollute commander args
