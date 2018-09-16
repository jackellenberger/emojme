module.exports = {
  authPair: ['subdomain1', 'token1'],
  authPairs: function(n) {
    return Array(n).map((x, i) => [`subdomain${i}`, `token${i}`])
  },
  testEmoji: function(i) {
    return {
      name: `emoji-${i}`,
      is_alias: i % 2,
      alias_for: `emoji-1`,
      url: `http://path/to/emoji/${i}.png`,
      user_display_name: `test-user-${i % 2}`
    };
  },
  testEmojiList: function(n) {
    return Array(n).map((x, i) => this.testEmoji(i));
  },
  mockedSlackResponse: function(emojiCount, pageSize, page, ok) {
    return {
      ok: ok,
      emoji: this.testEmojiList(pageSize),
      custom_emoji_total_count: emojiCount,
      paging: {
        count: pageSize,
        total: emojiCount,
        page: page,
        pages: Math.ceil(emojiCount / pageSize)
      }
    };
  }
}
