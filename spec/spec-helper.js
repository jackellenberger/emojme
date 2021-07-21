const fs = require('fs');

module.exports = {
  authTuple: ['subdomain1', 'token1'],
  authTuples(n) {
    return Array(n).map((x, i) => [`subdomain${i}`, `token${i}`]);
  },
  emojiName(i) {
    return `emoji-${i}`;
  },
  userName(i) {
    return `test-user-${i % 2}`;
  },
  testEmoji(i) {
    return {
      name: this.emojiName(i),
      is_alias: i % 2,
      alias_for: this.emojiName(1),
      url: './spec/fixtures/Example.jpg',
      user_display_name: this.userName(i),
      created: i * 86400,
    };
  },
  testEmojiList(n) {
    return Array(n).fill(0).map((x, i) => this.testEmoji(i));
  },
  mockedSlackResponse(emojiCount, pageSize, page, ok) {
    return {
      ok: ok === undefined ? true : ok,
      emoji: this.testEmojiList(pageSize),
      custom_emoji_total_count: emojiCount,
      paging: {
        count: pageSize,
        total: emojiCount,
        page,
        pages: Math.ceil(emojiCount / pageSize),
      },
    };
  },
  mockedBootData() {
    return JSON.parse(fs.readFileSync('spec/fixtures/clientBoot.json'));
  },
};
