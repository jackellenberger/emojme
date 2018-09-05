const program = require('commander');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

function list(val, memo) {
  memo = memo || [];
  memo.push(val);
  return memo;
}

function main() {
  program
    .version(require('./package').version)
    .option('-d, --debug', 'Run in debug mode')
    .option('-c, --config [value]', 'a configuration file to hold required variables otherwise passed in as parameters. See config.json for an example.')
    .option('download', 'download all emoji from given subdomain')
    .option('upload', 'upload source emoji to given subdomain')
    .option('user-stats', 'get emoji statistics for given user on given subdomain')
    .option('-s, --subdomain [value]', 'slack subdomain. Can be specified multiple times, paired with respective token.', list, [])
    .option('-t, --token [value]', 'slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, [])
    .option('--user [value]', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', list, null)
    .option('--src [value]', 'source file for emoji json you\'d like to upload')
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  if (program.download) {
    adminList = new EmojiAdminList(program);
    return adminList.get();
  }
  if (program.upload) {
    emojiAdd = new EmojiAdd(program);
    return emojiAdd.upload();
  }
  if (program.userStats) {
    if (!program.user) {
      return Promise.reject('Required option --user not specified');
    }
    adminList = new EmojiAdminList(program);
    return adminList.get().then(emojiList => {
      adminList.summarizeUserStats(emojiList);
    });
  }
}

if (require.main === module) {
  main()
    .then(() => {console.log('Done.')})
    .catch((err) => { console.log(`Error: ${err}`) });
}
