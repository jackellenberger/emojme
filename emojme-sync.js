const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const Cli = require('./lib/util/cli');
const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');
/** @module sync */

/**
 * The sync response object, like other response objects, is organized by input subdomain.
 * @typedef {object} syncResponseObject
 * @property {object} subdomain each subdomain passed in to add will appear as a key in the response
 * @property {emojiList[]} subdomain.emojiList the list of emoji added to `subdomain`, with each element an emoji pulled from either `srcSubdomain` or `subdomains` less the subdomain in question.
 */

/**
 * Sync emoji between slack subdomains
 *
 * Sync can be executed in either a "one way" or "n way" configuration, and both configurations can have a variable number of sources and destinations. In a "one way" configuration, all emoji from all source subdomains will be added to all destination subdomains" and can be set by specifying `srcSubdomains` and `dstSubdomains`. In an "n way" configuration, every subdomain given is treated as the destination for every emoji in every other subdomain.
 *
 * @async
 * @param {string|string[]|null} subdomains Two ore more subdomains that you wish to have the same emoji pool
 * @param {string|string[]|null} tokens User tokens corresponding to the given subdomains
 * @param {object} options contains src* and dst* information for "one way" sync configuration. Either specify `subdomains` and `tokens`, or `srcSubdomains`, `srcTokens`, `dstSubdomains`, and `dstTokens`, not both.
 * @param {string|string[]} [options.srcSubdomains] slack instances from which to draw emoji. No additions will be made to these subdomains
 * @param {string|string[]} [options.srcTokens] user tokens for the slack instances from which to draw emoji
 * @param {string|string[]} [options.dstSubdomains] slack instances in which all source emoji will be deposited. None of `dstSubdomain`'s emoji will end up in `srcSubdomain`
 * @param {string|string[]} [options.dstTokens] user tokens for the slack instances where emoji will be deposited
 * @param {boolean} [options.bustCache] if `true`, ignore any adminList younger than 24 hours and repull slack instance's existing emoji. Can be useful for making `options.avoidCollisions` more accurate
 * @param {boolean} [options.output] if `false`, no files will be written during execution. Prevents saving of adminList for future use
 *
 * @returns {Promise<syncResponseObject>} syncResponseObject result object
 *
 * @example
var syncOptions = {
  srcSubdomains: ['srcSubdomain'], // copy all emoji from srcSubdomain...
  srcTokens: ['srcToken'],
  dstSubdomains: ['dstSubdomain1', 'dstSubdomain2'], // ...to dstSubdomain1 and dstSubdomain2
  dstTokens: ['dstToken1', 'dstToken2'],
  bustCache: true // get fresh lists to make sure we're not doing more lifting than we have to
};
var syncResults = await emojme.sync(null, null, syncOptions);
console.log(syncResults);
// {
//   dstSubdomain1: {
//     emojiList: [
//       { name: emoji-1-from-srcSubdomain ... },
//       { name: emoji-2-from-srcSubdomain ... }
//     ]
//   },
//   dstSubdomain2: {
//     emojiList: [
//       { name: emoji-1-from-srcSubdomain ... },
//       { name: emoji-2-from-srcSubdomain ... }
//     ]
//   }
// }
 */
async function sync(subdomains, tokens, options) {
  let uploadedDiffPromises;
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};

  const [authPairs, srcPairs, dstPairs] = Helpers.zipAuthPairs(subdomains, tokens, options);

  if (subdomains.length > 0) {
    const emojiLists = await Promise.all(
      authPairs.map(async authPair => new EmojiAdminList(...authPair, options.output)
        .get(options.bustCache)),
    );

    const diffs = EmojiAdminList.diff(emojiLists, subdomains);
    uploadedDiffPromises = diffs.map((diffObj) => {
      const pathSlug = `to-${diffObj.dstSubdomain}.from-${diffObj.srcSubdomains.join('-')}`;
      if (options.output) FileUtils.writeJson(`./build/${pathSlug}.emojiAdminList.json`, diffObj.emojiList);

      const emojiAdd = new EmojiAdd(diffObj.dstSubdomain, _.find(
        authPairs,
        [0, diffObj.dstSubdomain],
      )[1]);
      return emojiAdd.upload(diffObj.emojiList).then((results) => {
        if (results.errorList && results.errorList.length > 0 && options.output) FileUtils.writeJson(`./build/${pathSlug}.emojiUploadErrors.json`, results.errorList);
        return results;
      });
    });
  } else if (srcPairs && dstPairs) {
    const srcDstPromises = [srcPairs, dstPairs].map(pairs => Promise.all(
      pairs.map(async pair => new EmojiAdminList(...pair, options.output)
        .get(options.bustCache)),
    ));

    const [srcEmojiLists, dstEmojiLists] = await Promise.all(srcDstPromises);
    const diffs = EmojiAdminList.diff(
      srcEmojiLists, options.srcSubdomains, dstEmojiLists, options.dstSubdomains,
    );
    uploadedDiffPromises = diffs.map((diffObj) => {
      const pathSlug = `to-${diffObj.dstSubdomain}.from-${diffObj.srcSubdomains.join('-')}`;
      if (options.output) FileUtils.writeJson(`./build/${pathSlug}.emojiAdminList.json`, diffObj.emojiList);

      const emojiAdd = new EmojiAdd(
        diffObj.dstSubdomain,
        _.find(authPairs, [0, diffObj.dstSubdomain])[1],
        options.output,
      );
      return emojiAdd.upload(diffObj.emojiList).then((results) => {
        if (results.errorList && results.errorList.length > 0 && options.output) FileUtils.writeJson(`./build/${pathSlug}.emojiUploadErrors.json`, results.errorList);
        return results;
      });
    });
  } else {
    throw new Error('Invalid Input');
  }

  return Helpers.formatResultsHash(await Promise.all(uploadedDiffPromises));
}

function syncCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program)
    .option('--src-subdomain [value]', 'subdomain from which to draw emoji for one way sync', Cli.list, null)
    .option('--src-token [value]', 'token with which to draw emoji for one way sync', Cli.list, null)
    .option('--dst-subdomain [value]', 'subdomain to which to emoji will be added is one way sync', Cli.list, null)
    .option('--dst-token [value]', 'token with which emoji will be added for one way sync', Cli.list, null)
    // Notice that this is missing --force and --prefix. These have been
    // deemed TOO POWERFUL for mortal usage. If you _really_ want that
    // power, you can download then upload the adminlist you retrieve.
    .parse(process.argv);

  return sync(program.subdomain, program.token, {
    srcSubdomains: program.srcSubdomain,
    srcTokens: program.srcToken,
    dstSubdomains: program.dstSubdomain,
    dstTokens: program.dstToken,
    bustCache: program.bustCache,
    output: program.output,
  });
}

if (require.main === module) {
  syncCli();
}

module.exports = {
  sync,
  syncCli,
};
