const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');
const Cli = require('./lib/util/cli');

async function add(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};
  const aliases = Helpers.arrayify(options.aliasFor);
  const names = Helpers.arrayify(options.name);
  const sources = Helpers.arrayify(options.src);
  let inputEmoji = []; let name; let alias; let
    source;

  while (aliases.length || sources.length) {
    name = names.shift();
    if (source = sources.shift()) {
      inputEmoji.push({
        is_alias: 0,
        url: source,
        name: name || source.match(/(?:.*\/)?(.*).(jpg|jpeg|png|gif)/)[1],
      });
    } else {
      alias = aliases.shift();
      inputEmoji.push({
        is_alias: 1,
        alias_for: alias,
        name,
      });
    }
  }

  if (names.length || _.find(inputEmoji, ['name', undefined])) {
    return Promise.reject(new Error('Invalid input. Either not all inputs have been consumed, or not all emoji are well formed. Consider simplifying input, or padding input with `null` values.'));
  }

  const [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  const addPromises = authPairs.map(async (authPair) => {
    const emojiAdd = new EmojiAdd(...authPair);
    const existingEmojiList = await new EmojiAdminList(...authPair, options.output)
      .get(options.bustCache);
    const existingNameList = existingEmojiList.map(e => e.name);

    if (options.prefix) {
      inputEmoji = Helpers.applyPrefix(inputEmoji, options.prefix);
    }

    if (options.avoidCollisions) {
      inputEmoji = Helpers.avoidCollisions(inputEmoji, existingEmojiList);
    }

    const [collisions, emojiToUpload] = _.partition(inputEmoji,
      emoji => existingNameList.includes(emoji.name));

    return emojiAdd.upload(emojiToUpload).then((uploadResult) => {
      if (uploadResult.errorList && uploadResult.errorList.length > 1 && options.output) {
        FileUtils.writeJson(`./build/${this.subdomain}.emojiUploadErrors.json`, uploadResult.errorList);
      }
      return Object.assign({}, uploadResult, { collisions });
    });
  });

  return Helpers.formatResultsHash(await Promise.all(addPromises));
}

function addCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program);
  Cli.allowEmojiAlterations(program)
    .option('--src <value>', 'source image/gif/#content for emoji you\'d like to upload', Cli.list, null)
    .option('--name <value>', 'name of the emoji from --src that you\'d like to upload', Cli.list, null)
    .option('--alias-for <value>', 'name of the emoji you\'d like --name to be an alias of. Specifying this will negate --src', Cli.list, null)
    .parse(process.argv);

  return add(program.subdomain, program.token, {
    src: program.src,
    name: program.name,
    aliasFor: program.aliasFor,
    bustCache: program.bustCache,
    avoidCollisions: program.avoidCollisions,
    prefix: program.prefix,
    output: program.output,
    verbose: program.verbose,
  });
}


if (require.main === module) {
  addCli();
}

module.exports = {
  add,
  addCli,
};
