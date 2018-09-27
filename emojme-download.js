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
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  let downloadPromises = authPairs.map(async authPair => {
    let adminList = new EmojiAdminList(...authPair);
    let emojiList = await adminList.get(options.bustCache);
    if (options.save)
      return await EmojiAdminList.save(emojiList, authPair[0], options.user);

    return emojiList;
  });

  return Promise.all(downloadPromises);
}

module.exports.download = download;
