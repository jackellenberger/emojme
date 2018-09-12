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
    .option('sync', 'get emoji statistics for given user on given subdomain')
    .option('-s, --subdomain [value]', 'slack subdomain. Can be specified multiple times, paired with respective token.', list, null)
    .option('-t, --token [value]', 'slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, null)
    .option('--user [value]', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', list, null)
    .option('--top [value]', 'the top n users you\'d like user emoji statistics on', 10)
    .option('--src [value]', 'source file for emoji json you\'d like to upload')
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  if (!program.subdomain || !program.token) {
    return Promise.reject('At least one subdomain/token pair is required');
  }

  if (program.download) {
    adminList = new EmojiAdminList(program);
    return adminList.get();
  }
  if (program.upload) {
    if (!program.src) {
      return Promise.reject('Required option --src not specified');
    }
    emojiAdd = new EmojiAdd(program);
    return emojiAdd.upload();
  }
  if (program.userStats) {
    adminList = new EmojiAdminList(program);
    return adminList.get().then(emojiList => {
      if (program.user) {
        adminList.summarizeUser(emojiList, program.user);
      } else {
        adminList.summarizeSubdomain(emojiList, program.top);
      }
    });
  }
  if (program.sync) {
    if (program.subdomain.length < 2 || program.subdomain.length != program.token.length) {
      return Promise.reject('Sync requires pairs of subdomain / token arguments');
    }
    adminList1 = new EmojiAdminList(Object.assign({}, program, {subdomain: program.subdomain[0], token: program.token[0]}));
    adminList2 = new EmojiAdminList(Object.assign({}, program, {subdomain: program.subdomain[1], token: program.token[1]}));
    return Promise.all([adminList1.get(), adminList2.get()]).then((lists) => {
      let diffsToUpload = EmojiAdminList.diff(lists, program.subdomain);
      Promise.resolve(diffsToUpload);
    });
  }
}

if (require.main === module) {
  main()
    .then(() => {console.log('Done.')})
    .catch((err) => { console.log(`Error: ${err}`) });
}
