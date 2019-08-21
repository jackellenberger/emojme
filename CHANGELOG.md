# 1.8.0
* Add confusingly named `allowCollisions` to `add` and `upload` endpoints alongside existing `avoidCollisions` param
  * When set, no adminList will be pre-fetched to prevent collisions. This allows uploads to execute much faster, but with "untrusted" uploads it could cause many more errors and therefore rate limiting.
  * In a future major version: `avoidCollisions` will be renamed to more-accurate `preventCollisions` and `allowCollisions` will be negated and renamed to `avoidCollisison`. For the time being, we don't need a 2.0 / breaking change.

# 1.7.0
* Add /client.boot endpoint accessor
* Add emojme favorites function to find a user's favorite emoji
  * This comprises the content of the `Frequently Used` emoji box
  * Also includes personal emoji usage counts (!?)

# 1.6.3
* Update README to reflect slack's new api_token location
* Fix rate limiting for good this time
* Resolve npm audit vulnerability

# 1.6.0
* Implement rate limiting
  * rate varies depending on endpoint
  * Can be overridden but new environment variables
    * SLACK_REQUEST_CONCURRENCY
    * SLACK_REQUEST_RATE
    * SLACK_REQUEST_WINDOW
  * Add naive backoff logic
* Add timestamps to logs

# 1.5.1
* Resolve npm audit vulnerability

# 1.5.0
* Rework logging to be less noisy and more organized.
   * Use Winston
   * log warning and worse to the console
   * log everything to log/combined.log
   * Add verbosity control
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
