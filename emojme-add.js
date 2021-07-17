const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');
const Cli = require('./lib/util/cli');
/** @module add */

/**
 * The add response object, like other response objects, is organized by input subdomain.
 * @typedef {object} addResponseObject
 * @property {object} subdomain each subdomain passed in to add will appear as a key in the response
 * @property {emojiList[]} subdomain.emojiList the list of emoji added to `subdomain`, with each element reflecting the parameters passed in to `add`
 * @property {emojiList[]} subdomain.collisions if `options.avoidCollisions` is `false`, emoji that cannot be uploaded due to existing conflicting emoji names will exist here
 */

/**
 * Add emoji described by parameters within options to the specified subdomain(s).
 *
 * Note that options can accept both aliases and original emoji at the same time, but ordering can get complicated and honestly I'd skip it if I were you. For each emoji, make sure that every descriptor (src, name, aliasFor) has a value, using `null`s for fields that are not relevant to the current emoji.
 *
 * @async
 * @param {string|string[]} subdomains a single or list of subdomains to add emoji to. Must match respectively to `token`s and `cookie`s.
 * @param {string|string[]} tokens a single or list of tokens to add emoji to. Must match respectively to `subdomain`s and `cookie`s.
 * @param {string|string[]} cookies a single or list of cookies used to authenticate access to the given subdomain. Must match respectively to `subdomain`s and `token`s.
 * @param {object} options contains singleton or arrays of emoji descriptors.
 * @param {string|string[]} [options.src] source image files for the emoji to be added. If no corresponding `options.name` is given, the filename will be used
 * @param {string|string[]} [options.name] names of the emoji to be added, overriding filenames if given, and becoming the alias name if an `options.aliasFor` is given
 * @param {string|string[]} [options.aliasFor] names of emoji to be aliased to `options.name`
 * @param {boolean} [options.allowCollisions] if `true`, emoji being uploaded will not be checked against existing emoji. This will take less time up front but may cause more errors.
 * @param {boolean} [options.avoidCollisions] if `true`, emoji being added will be renamed to not collide with existing emoji. See {@link lib/util/helpers.avoidCollisions} for logic and details // TODO: fix this link, maybe link to tests which has better examples
 * @param {string} [options.prefix] string to prefix all emoji being uploaded
 * @param {boolean} [options.bustCache] if `true`, ignore any adminList younger than 24 hours and repull slack instance's existing emoji. Can be useful for making `options.avoidCollisions` more accurate
 * @param {boolean} [options.output] if `false`, no files will be written during execution. Prevents saving of adminList for future use
 *
 * @returns {Promise<addResponseObject>} addResponseObject result object
 *
 * @example
var addOptions = {
  src: ['./emoji1.jpg', 'http://example.com/emoji2.png'], // upload these two images
  name: ['myLocalEmoji', 'myOnlineEmoji'], // call them these two names
  bustCache: false, // don't bother redownloading existing emoji
  avoidCollisions: true, // if there are similarly named emoji, change my new emoji names
  output: false // don't write any files
};
var subdomains = ['mySubdomain1', 'mySubdomain2'] // can add one or multiple
var tokens = ['myToken1', 'myToken2'] // can add one or multiple
var addResults = await emojme.add(subdomains, tokens, addOptions);
console.log(userStatsResults);
// {
//   mySubomain1: {
//     collisions: [], // only defined if avoidCollisons = false
//     emojiList: [
//       { name: 'myLocalEmoji', ... },
//       { name: 'myOnlineEmoji', ... },
//     ]
//   },
//   mySubomain2: {
//     collisions: [], // only defined if avoidCollisons = false
//     emojiList: [
//       { name: 'myLocalEmoji', ... },
//       { name: 'myOnlineEmoji', ... },
//     ]
//   }
// }
 */
async function add(subdomains, tokens, cookies, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  cookies = Helpers.arrayify(cookies);
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

  const [authTuples] = Helpers.zipAuthTuples(subdomains, tokens, cookies);

  const addPromises = authTuples.map(async (authTuple) => {
    let emojiToUpload = []; let
      collisions = [];

    if (options.prefix) {
      inputEmoji = Helpers.applyPrefix(inputEmoji, options.prefix);
    }

    if (options.allowCollisions) {
      emojiToUpload = inputEmoji;
    } else {
      const existingEmojiList = await new EmojiAdminList(...authTuple, options.output)
        .get(options.bustCache);
      const existingNameList = existingEmojiList.map(e => e.name);

      if (options.avoidCollisions) {
        inputEmoji = Helpers.avoidCollisions(inputEmoji, existingEmojiList);
      }

      [collisions, emojiToUpload] = _.partition(inputEmoji,
        emoji => existingNameList.includes(emoji.name));
    }

    const emojiAdd = new EmojiAdd(...authTuple);
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

  Cli.unpackAuthJson(program);

  return add(program.subdomain, program.token, program.cookie, {
    src: program.src,
    name: program.name,
    aliasFor: program.aliasFor,
    bustCache: program.bustCache,
    allowCollisions: program.allowCollisions,
    avoidCollisions: program.avoidCollisions,
    prefix: program.prefix,
    output: program.output,
  });
}


if (require.main === module) {
  addCli();
}

module.exports = {
  add,
  addCli,
};
