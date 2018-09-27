'use strict';

const _ = require('lodash');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  const program = require('commander');

  Util.requireAuth(program)
    .option('--src <value>', 'source file(s) for emoji json you\'d like to upload', Util.list, null)
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return upload(program.subdomain, program.token, {
    src: program.src,
    cache: program.cache
  });
}

async function upload(subdomains, tokens, options) {
  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  return authPairs.forEach(async authPair => {
    //TODO: this should also download the adminlist then either cull collisions or append -1 if --force
    let emojiAdd = new EmojiAdd(...authPair);
    await emojiAdd.upload(options.src);
  });
}

module.exports.upload = upload;
