'use strict';

const _ = require('lodash');
const fs = require('graceful-fs');

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
    .option('--src <value>', 'source file(s) for emoji json or yaml you\'d like to upload')
    .parse(process.argv)

  return upload(program.subdomain, program.token, {
    src: program.src,
    bustCache: program.bustCache,
    avoidCollisions: program.avoidCollisions,
    prefix: program.prefix,
    output: program.output
  });
}

async function upload(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};
  let inputEmoji;

  //TODO this isn't handling --src file --src file correctly
  if (Array.isArray(options.src)) {
    inputEmoji = options.src;
  } else if (!fs.existsSync(options.src)) {
    throw new Error(`Emoji source file ${options.src} does not exist`);
  } else {
    const fileType = options.src.split('.').slice(-1)[0];
    if (fileType.match(/yaml|yml/)) {
      inputEmoji = FileUtils.readYaml(options.src);
    } else if (fileType.match(/json/)) {
      inputEmoji = FileUtils.readJson(options.src);
    } else {
      throw new Error(`Filetype ${fileType} is not supported`);
    }
  }

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  let uploadPromises = authPairs.map(async authPair => {
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

    let emojiAdd = new EmojiAdd(...authPair);
    let uploadResult = await emojiAdd.upload(emojiToUpload);
    return Object.assign({}, uploadResult, {collisions: collisions});
  });

  return Helpers.formatResultsHash(await Promise.all(uploadPromises));
}

module.exports.upload = upload;
