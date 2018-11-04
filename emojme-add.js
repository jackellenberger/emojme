'use strict';

const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');

if (require.main === module) {
  return addCli();
}

function addCli() {
  const program = new commander.Command();
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
};

async function add(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};
  let aliases = Helpers.arrayify(options.aliasFor);
  let names = Helpers.arrayify(options.name);
  let sources = Helpers.arrayify(options.src);
  let inputEmoji = [], name, alias, source;

  while (aliases.length || sources.length) {
    name = names.shift();
    if (source = sources.shift()) {
      inputEmoji.push({
        is_alias: 0,
        url: source,
        name: name ? name : source.match(/(?:.*\/)?(.*).(jpg|jpeg|png|gif)/)[1]
      });
    } else {
      alias = aliases.shift();
      inputEmoji.push({
        is_alias: 1,
        alias_for: alias,
        name: name
      });
    }
  }

  if (names.length || _.find(inputEmoji, ['name', undefined])) {
    return Promise.reject('Invalid input. Either not all inputs have been consumed, or not all emoji are well formed. Consider simplifying input, or padding input with `null` values.');
  }

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  let addPromises = authPairs.map(async authPair => {
    let emojiAdd = new EmojiAdd(...authPair);
    let existingEmojiList = await new EmojiAdminList(...authPair, options.output).get(options.bustCache)
    let existingNameList = existingEmojiList.map(e => e.name);

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

  return Helpers.formatResultsHash(await Promise.all(addPromises));
}

module.exports = {
  add: add,
  addCli: addCli
};
