"use strict";

const _ = require('lodash');
const program = require('commander');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

async function downloadCli() {
  Util.requireAuth(program)
    .option('--user <value>', '[download, user-stats] slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Util.list, null)
    .option('--save', '[download] create local files of the given subdomain\s emoji')
    .option('--no-cache', '[download/user-stats/sync] force a redownload of all cached info.')
    .parse(process.argv)

  let pairs = Util.zipAuthPairs(program);

  if (!Util.hasValidSubdomainInputs(program)) {
    console.log(program.help());
    return;
  }

  return pairs.authPairs.forEach(async authPair => {
    let adminList = new EmojiAdminList(...authPair);
    let emojiList = await adminList.get(program.cache);
    if (program.save)
      await EmojiAdminList.save(emojiList, authPair[0], program.user);
  });
}

module.exports = downloadCli();
