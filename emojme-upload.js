'use strict';

const _ = require('lodash');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  const program = require('commander');

  Util.requireAuth(program)
    .option('--src <value>', 'source file(s) for emoji json you\'d like to upload', Util.list, null)
    .option('--bust-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return upload(program.subdomain, program.token, {
    src: program.src,
    bustCache: program.bustCache
  });
}

async function upload(subdomains, tokens, options) {
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  let uploadPromises = authPairs.map(async authPair => {
    //TODO: this should also download the adminlist then either cull collisions or append -1 if --force
    let emojiAdd = new EmojiAdd(...authPair);
    return await emojiAdd.upload(options.src);
  });

  return Promise.all(uploadPromises);
}

module.exports.upload = upload;
