

const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');

const Cli = require('./lib/util/cli');
const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');

async function userStats(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  const users = Helpers.arrayify(options.user);
  options = options || {};

  const [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  const userStatsPromises = authPairs.map(async (authPair) => {
    const emojiAdminList = new EmojiAdminList(...authPair, options.output);
    const emojiList = await emojiAdminList.get(options.bustCache);
    if (users && users.length > 0) {
      const results = EmojiAdminList.summarizeUser(emojiList, authPair[0], users);
      return results.map((result) => {
        const safeUserName = result.user.toLowerCase().replace(/ /g, '-');
        FileUtils.writeJson(`./build/${safeUserName}.${result.subdomain}.adminList.json`, result.userEmoji, null, 3);
        return { subdomain: authPair[0], userStatsResults: results, emojiList };
      });
    }
    const results = EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], options.top);
    results.forEach((result) => {
      const safeUserName = result.user.toLowerCase().replace(/ /g, '-');
      FileUtils.writeJson(`./build/${safeUserName}.${result.subdomain}.adminList.json`, result.userEmoji, null, 3);
    });

    return { subdomain: authPair[0], userStatsResults: results, emojiList };
  });

  return Helpers.formatResultsHash(_.flatten(await Promise.all(userStatsPromises)));
}

function userStatsCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program)
    .option('--user <value>', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Cli.list, null)
    .option('--top <value>', 'the top n users you\'d like user emoji statistics on', 10)
    .parse(process.argv);

  return userStats(program.subdomain, program.token, {
    user: program.user,
    top: program.top,
    bustCache: program.bustCache,
    output: program.output,
  });
}

if (require.main === module) {
  userStatsCli();
}

module.exports = {
  userStats,
  userStatsCli,
};
