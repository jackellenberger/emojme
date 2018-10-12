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
    //TODO: re-add --user option to save user admin list without getting stats or saving to disk
    .option('--save <user>', 'save all of <user>\'s emoji to disk. specify "all" to save all emoji.', Cli.list, [])
    .parse(process.argv)

  return download(program.subdomain, program.token, {
    user: program.user,
    save: program.save,
    bustCache: program.bustCache,
    output: program.output
  });
}

async function download(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};

  let [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  let downloadPromises = authPairs.map(async authPair => {
    let [subdomain, token] = authPair;
    let saveResults;

    let adminList = new EmojiAdminList(...authPair, options.output);
    let emojiList = await adminList.get(options.bustCache);
    if (options.save && options.save.length) {
      saveResults = await EmojiAdminList.save(emojiList, subdomain, options.save);
    }

    return {emojiList: emojiList, subdomain: subdomain, saveResults: saveResults};
  });

  return Helpers.formatResultsHash(await Promise.all(downloadPromises));
}

module.exports.download = download;
