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
    .option('--bust-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return userStats(program.subdomain, program.token, {
    user: program.user,
    top: program.top,
    bustCache: program.bustCache
  });
}

async function userStats(subdomains, tokens, options) {
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  let userStatsPromises = authPairs.map(async authPair => {
    let emojiAdminList = new EmojiAdminList(...authPair);
    let emojiList = await emojiAdminList.get(options.bustCache);
    if (options.user) {
      return EmojiAdminList.summarizeUser(emojiList, authPair[0], options.user);
    } else {
      return EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], options.top);
    }
  });

  return Promise.all(userStatsPromises);
}

module.exports.userStats = userStats;
