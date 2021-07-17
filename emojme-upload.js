const _ = require('lodash');
const fs = require('graceful-fs');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const Cli = require('./lib/util/cli');
const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');
/** @module upload */

/**
 * The upload response object, like other response objects, is organized by input subdomain.
 * @typedef {object} syncResponseObject
 * @property {object} subdomain each subdomain passed in to add will appear as a key in the response
 * @property {emojiList[]} subdomain.emojiList the list of emoji added to `subdomain`, with each element an emoji pulled from either `srcSubdomain` or `subdomains` less the subdomain in question.
 * @property {emojiList[]} subdomain.collisions if `options.avoidCollisions` is `false`, emoji that cannot be uploaded due to existing conflicting emoji names will exist here
 */

/**
 * The required format of a json file that can be used as the `options.src` for {@link upload}
 *
 * To see an example, use {@link download}, then look at `buidl/*.adminList.json`
 *
 * @typedef {Array} jsonEmojiListFormat
 * @property {Array} emojiList
 * @property {object} emojiList.emojiObject
 * @property {string} emojiList.emojiObject.name the name of the emoji
 * @property {1|0} emojiList.emojiObject.is_alias whether or not the emoji is an alias. If `1`, `alias_for` is require and `url` is ignored. If `0` vice versa
 * @property {string} emojiList.emojiObject.alias_for the name of the emoji this emoji is apeing
 * @property {string} emojiList.emojiObject.url the remote url or local path of the emoji
 * @property {string} emojiList.emojiObject.user_display_name the name of the emoji creator
 *
 * @example
 * [
 *   {
 *      "name": "a_giving_lovely_generous_individual",
 *      "is_alias": 1,
 *      "alias_for": "caleb"
 *   },
 *   {
 *     "name": "gooddoggy",
 *     "is_alias": 0,
 *     "alias_for": null,
 *     "url": "https://emoji.slack-edge.com/T3T9KQULR/gooddoggy/849f53cf1de25f97.png"
 *   }
 * ]
 */

/**
 * The required format of a yaml file that can be used as the `options.src` for {@link upload}
 * @typedef {object} yamlEmojiListFormat
 * @property {object} topLevelYaml all keys execpt for `emojis` are ignored
 * @property {Array} emojis the array of emoji objects
 * @property {object} emojis.emojiObject
 * @property {string} emojis.emojiObject.name the name of the emoji
 * @property {string} emojis.emojiObject.src alias for `name`
 * @property {1|0} emojis.emojiObject.is_alias whether or not the emoji is an alias. If `1`, `alias_for` is require and `url` is ignored. If `0` vice versa
 * @property {string} emojis.emojiObject.alias_for the name of the emoji this emoji is apeing
 * @property {string} emojis.emojiObject.url the remote url or local path of the emoji
 * @property {string} emojis.emojiObject.user_display_name the name of the emoji creator
 *
 * @example
 *  title: animals
 *  emojis:
 *    - name: llama
 *      src: http://i.imgur.com/6bKXKUP.gif
 *    - name: alpaca
 *      src: http://i.imgur.com/c6QxTbM.gif
 */

/**
 * Upload multiple emoji described by an existing list on disk, either as a json emoji admin list or emojipacks-like yaml.
 *
 * @async
 * @param {string|string[]} subdomains a single or list of subdomains from which to download emoji. Must match respectively to `token`s and `cookie`s.
 * @param {string|string[]} tokens a single or list of tokens with which to authenticate. Must match respectively to `subdomain`s and `cookie`s.
 * @param {string|string[]} cookies a single or list of cookies used to authenticate access to the given subdomain. Must match respectively to `subdomain`s and `token`s.
 * @param {object} options contains singleton or arrays of emoji descriptors.
 * @param {string|string[]} options.src source emoji list files for the emoji to be added. Can either be in {@link jsonEmojiListFormat} or {@link yamlEmojiListFormat}
 * @param {boolean} [options.avoidCollisions] if `true`, emoji being added will be renamed to not collide with existing emoji. See {@link lib/util/helpers.avoidCollisions} for logic and details // TODO: fix this link, maybe link to tests which has better examples
 * @param {string} [options.prefix] string to prefix all emoji being uploaded
 * @param {boolean} [options.bustCache] if `true`, ignore any adminList younger than 24 hours and repull slack instance's existing emoji. Can be useful for making `options.avoidCollisions` more accurate
 * @param {boolean} [options.output] if `false`, no files will be written during execution. Prevents saving of adminList for future use, as well as the writing of log files
 * @param {boolean} [options.verbose] if `true`, all messages will be written to stdout in addition to combined log file.
 *
 * @returns {Promise<uploadResponseObject>} uploadResponseObject result object
 *
 * @example
var uploadOptions = {
  src: './emoji-list.json', // upload all the emoji in this json array of objects
  avoidCollisions: true, // append '-1' or similar if we try to upload a dupe
  prefix: 'new-' // prepend every emoji in src with "new-", e.g. "emoji" becomes "new-emoji"
};
var uploadResults = await emojme.upload('mySubdomain', 'myToken', uploadOptions);
console.log(uploadResults);
// {
//   mySubdomain: {
//     collisions: [
//       { name: an-emoji-that-already-exists-in-mySubdomain ... }
//     ],
//     emojiList: [
//       { name: emoji-from-emoji-list-json ... },
//       { name: emoji-from-emoji-list-json ... },
//       ...
//     ]
//   }
// }
 */
async function upload(subdomains, tokens, cookies, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  cookies = Helpers.arrayify(cookies);
  options = options || {};
  let inputEmoji;

  // TODO this isn't handling --src file --src file correctly
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

  const [authTuples] = Helpers.zipAuthTuples(subdomains, tokens, cookies);

  const uploadPromises = authTuples.map(async (authTuple) => {
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
    const uploadResult = await emojiAdd.upload(emojiToUpload);
    return Object.assign({}, uploadResult, { collisions });
  });

  return Helpers.formatResultsHash(await Promise.all(uploadPromises));
}

function uploadCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program);
  Cli.allowEmojiAlterations(program)
    .option('--src <value>', 'source file(s) for emoji json or yaml you\'d like to upload')
    .parse(process.argv);
  Cli.unpackAuthJson(program);

  return upload(program.subdomain, program.token, program.cookie, {
    src: program.src,
    bustCache: program.bustCache,
    allowCollisions: program.allowCollisions,
    avoidCollisions: program.avoidCollisions,
    prefix: program.prefix,
    output: program.output,
  });
}

if (require.main === module) {
  uploadCli();
}

module.exports = {
  upload,
  uploadCli,
};
