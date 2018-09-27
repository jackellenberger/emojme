'use strict';

const _ = require('lodash');
const program = require('commander');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  Util.requireAuth(program)
    .option('--user <value>', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Util.list, null)
    .option('--top <value>', 'the top n users you\'d like user emoji statistics on', 10)
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return userStats(program.subdomain, program.token, {
    user: program.user,
    top: program.top,
    cache: program.cache
  });
}

async function userStats(subdomain, token, options) {
  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  return authPairs.forEach(async authPair => {
    let emojiAdminList = new EmojiAdminList(...authPair);
    let emojiList = await emojiAdminList.get(options.cache);
    if (options.user) {
      EmojiAdminList.summarizeUser(emojiList, options.user);
    } else {
      EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], options.top);
    }
  });
}

module.exports.userStats = userStats;
