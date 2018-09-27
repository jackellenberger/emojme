'use strict';

const _ = require('lodash');
const program = require('commander');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  Util.requireAuth(program)
    .option('--user <value>', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Util.list, null)
    .option('--save', 'create local files of the given subdomain\s emoji')
    .option('--bust-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return download(program.subdomain, program.token, {
    user: program.user,
    save: program.save,
    bustCache: program.bustCache
  });
}

async function download(subdomains, tokens, options) {
  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  return authPairs.forEach(async authPair => {
    let adminList = new EmojiAdminList(...authPair);
    let emojiList = await adminList.get(options.bustCache);
    if (options.save)
      await EmojiAdminList.save(emojiList, authPair[0], options.user);
  });
}

module.exports.download = download;
