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
    .option('--src <value>', 'source file(s) for emoji json you\'d like to upload', Cli.list, null)
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
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  let uploadPromises = authPairs.map(async authPair => {
    //TODO: this should also download the adminlist then either cull collisions or append -1 if --force
    let emojiAdd = new EmojiAdd(...authPair);
    return await emojiAdd.upload(options.src);
  });

  return Promise.all(uploadPromises);
}

module.exports.upload = upload;
