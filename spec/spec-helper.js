module.exports = {
  authPair: ['subdomain1', 'token1'],
  authPairs: function(n) {
    return Array(n).map((x, i) => [`subdomain${i}`, `token${i}`])
  },
  emojiName: function(i) {
    return `emoji-${i}`;
  },
  userName: function(i) {
    return `test-user-${i % 2}`
  },
  testEmoji: function(i) {
    return {
      name: this.emojiName(i),
      is_alias: i % 2,
      alias_for: this.emojiName(1),
      url: `http://path/to/emoji/${i}.png`,
      user_display_name: this.userName(i)
    };
  },
  testEmojiList: function(n) {
    return Array(n).fill(0).map((x, i) => this.testEmoji(i));
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
