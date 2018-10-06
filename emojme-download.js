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
    .option('--user <value>', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Cli.list, null)
    .option('--save', 'create local files of the given subdomain\s emoji')
    .parse(process.argv)

  return download(program.subdomain, program.token, {
    user: program.user,
    save: program.save,
    bustCache: program.bustCache,
    output: program.output
  });
}

async function download(subdomains, tokens, options) {
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  let downloadPromises = authPairs.map(async authPair => {
    let adminList = new EmojiAdminList(...authPair, options.output);
    let emojiList = await adminList.get(options.bustCache);
    if (options.save)
      return await EmojiAdminList.save(emojiList, authPair[0], options.user);

    return emojiList;
  });

  return Promise.all(downloadPromises);
}

module.exports.download = download;
