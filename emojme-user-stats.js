'use strict';

const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');

if (require.main === module) {
  return userStatsCli();
}

function userStatsCli() {
  const program = new commander.Command();
  const Cli = require('./lib/util/cli');

  Cli.requireAuth(program)
  Cli.allowIoControl(program)
    .option('--user <value>', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Cli.list, null)
    .option('--top <value>', 'the top n users you\'d like user emoji statistics on', 10)
    .parse(process.argv)

  return userStats(program.subdomain, program.token, {
    user: program.user,
    top: program.top,
    bustCache: program.bustCache,
    output: program.output
  });
}

async function userStats(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  let users = Helpers.arrayify(options.user);
  options = options || {};

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  let userStatsPromises = authPairs.map(async authPair => {
    let emojiAdminList = new EmojiAdminList(...authPair, options.output);
    let emojiList = await emojiAdminList.get(options.bustCache);
    if (users && users.length > 0) {
      let results = EmojiAdminList.summarizeUser(emojiList, authPair[0], users)
      return results.map(result => {
        let safeUserName = result.user.toLowerCase().replace(/ /g, '-');
        FileUtils.writeJson(`./build/${safeUserName}.${result.subdomain}.adminList.json`, result.userEmoji, null, 3);
        return {subdomain: authPair[0], userStatsResults: results, emojiList: emojiList};
      });
    } else {
      let results = EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], options.top)
      results.forEach(result => {
        let safeUserName = result.user.toLowerCase().replace(/ /g, '-');
        FileUtils.writeJson(`./build/${safeUserName}.${result.subdomain}.adminList.json`, result.userEmoji, null, 3);
      });

      return {subdomain: authPair[0], userStatsResults: results, emojiList: emojiList};
    }
  });

  return Helpers.formatResultsHash(_.flatten(await Promise.all(userStatsPromises)));
}

module.exports = {
  userStats: userStats,
  userStatsCli: userStatsCli
};
