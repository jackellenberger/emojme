'use strict';

const _ = require('lodash');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');

if (require.main === module) {
  const program = require('commander');
  const Cli = require('./lib/util/cli');

  Cli.requireAuth(program)
  Cli.allowIoControl(program)
  Cli.allowEmojiAlterations(program)
    .option('--src <value>', 'source image/gif/#content for emoji you\'d like to upload', Cli.list, null)
    .option('--name <value>', 'name of the emoji from --src that you\'d like to upload', Cli.list, null)
    .option('--alias-for <value>', 'name of the emoji you\'d like --name to be an alias of. Specifying this will negate --src', Cli.list, null)
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

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

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
      inputEmoji = Helpers.applyPrefix(inputEmoji, options.prefix);
    }

    if (options.avoidCollisions) {
      inputEmoji = Helpers.avoidCollisions(inputEmoji, existingEmojiList);
    }

    let [collisions, emojiToUpload] = _.partition(inputEmoji, emoji => {
      return existingNameList.includes(emoji.name);
    });

    return emojiAdd.upload(emojiToUpload).then(uploadResult => {
      if (uploadResult.errorList && uploadResult.errorList.length > 1 && options.output)
        FileUtils.writeJson(`./build/${this.subdomain}.emojiUploadErrors.json`, errorJson);
      return Object.assign({}, uploadResult, {collisions: collisions});
    });
  });

  return Promise.all(addPromises);
}

module.exports.add = add;
