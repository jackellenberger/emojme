'use strict';

const _ = require('lodash');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  const program = require('commander');

  Util.requireAuth(program)
    .option('--src <value>', 'source file(s) for emoji json you\'d like to upload', list, null)
    .option('--name <value>', 'name of the emoji from --src that you\'d like to upload', list, null)
    .option('--alias-for <value>', 'name of the emoji you\'d like --name to be an alias of. Specifying this will negate --src', list, null)
    .option('--bust-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return add(program.subdomain, program.token, {
    src: program.src,
    name: program.name,
    aliasFor: program.aliasFor,
    bustCache: program.bustCache
  });
}

async function add(subdomains, tokens, options) {
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  if (!Util.hasValidSubdomainInputs(subdomains, tokens))
    throw new Error('Invalid Input');

  let addPromises = authPairs.map(async authPair => {
    let srcEmojiList;
    let emojiAdd = new EmojiAdd(...authPair);

    if (options.aliasFor) {
      srcEmojiList = _.zipWith(options.name, options.aliasFor, (name, aliasFor) => {
        return {
          is_alias: 1,
          name: name,
          alias_for: aliasFor
        }
      });
    } else {
      //TODO: this should also download the adminlist then either cull collisions or append -1 if --force
      srcEmojiList = _.zipWith(options.src, options.name, (src, name) => {
        return {
          is_alias: 0,
          name: name ? name : src.match(/(?:.*\/)?(.*).(jpg|jpeg|png|gif)/)[1],
          url: src
        }
      });
    }

    return await emojiAdd.upload(srcEmojiList);
  });

  return Promise.all(addPromises);
}

module.exports.add = add;
