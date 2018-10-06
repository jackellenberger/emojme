'use strict';

const _ = require('lodash');
const FileUtils = require('./lib/file-utils');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  const program = require('commander');

  Util.requireAuth(program)
    .option('--src <value>', 'source file(s) for emoji json you\'d like to upload', Util.list, null)
    .option('--name <value>', 'name of the emoji from --src that you\'d like to upload', Util.list, null)
    .option('--alias-for <value>', 'name of the emoji you\'d like --name to be an alias of. Specifying this will negate --src', Util.list, null)
    .option('--bust-cache', 'force a redownload of all cached info.', false)
    .option('--no-output', 'prevent writing of files.')
    .option('--avoid-collisions', 'instead of culling collisions, rename the emoji to be uploaded "intelligently"', false)
    .option('--prefix <value>', 'prefix all emoji to be uploaded with <value>')
    .parse(process.argv)

  return add(program.subdomain, program.token, {
    src: program.src,
    name: program.name,
    aliasFor: program.aliasFor,
    bustCache: program.bustCache,
    avoidCollisions: program.avoidCollisions,
    prefix: program.prefix,
    output: program.output
  });
}

async function add(subdomains, tokens, options) {
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Util.zipAuthPairs(subdomains, tokens);

  let addPromises = authPairs.map(async authPair => {
    let inputEmoji;
    let emojiAdd = new EmojiAdd(...authPair);
    let existingEmojiList = await new EmojiAdminList(...authPair, options.output).get(options.bustCache)
    let existingNameList = existingEmojiList.map(e => e.name);

    if (options.aliasFor) {
      inputEmoji = _.zipWith(options.name, options.aliasFor, (name, aliasFor) => {
        return {
          is_alias: 1,
          name: name,
          alias_for: aliasFor
        }
      });
    } else {
      inputEmoji = _.zipWith(options.src, options.name, (src, name) => {
        return {
          is_alias: 0,
          name: name ? name : src.match(/(?:.*\/)?(.*).(jpg|jpeg|png|gif)/)[1],
          url: src
        }
      });
    }

    if (options.prefix) {
      inputEmoji = Util.applyPrefix(inputEmoji, options.prefix);
    }

    if (options.avoidCollisions) {
      inputEmoji = Util.avoidCollisions(inputEmoji, existingEmojiList);
    }

    let [collisions, emojiToUpload] = _.partition(inputEmoji, emoji => {
      return existingNameList.includes(emoji.name);
    });

    return emojiAdd.upload(emojiToUpload).then(results => {
      if (results.errorList && results.errorList.length > 1 && options.output)
        FileUtils.writeJson(`./build/${this.subdomain}.emojiUploadErrors.json`, errorJson);
      return results;
    });
  });

  return Promise.all(addPromises);
}

module.exports.add = add;
