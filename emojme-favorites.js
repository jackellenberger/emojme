const _ = require('lodash');
const commander = require('commander');
const util = require('util');

const ClientBoot = require('./lib/client-boot');
const EmojiAdminList = require('./lib/emoji-admin-list');

const logger = require('./lib/logger');
const Cli = require('./lib/util/cli');
const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');
/** @module favorites */

/**
 * The user-specific favorites response object, like other response objects, is organized by input subdomain.
 * @typedef {object} favoritesResponseObject
 * @property {object} subdomain each subdomain passed in to add will appear as a key in the response
 * @property {object[]} subdomain.favorites the list of 'favorite' emoji as deemed by slack, in desc sorted order
 * @property {object} subdomain.favorites.emoji an emoji object, as organized by emojiAdminList
 * @property {Number} subdomain.favorites.usage the weight / ranking / number of usages slack has determined to give this emoji with respect to your usage
 */

/**
 * Get the contents of the "Frequenly Used" box for your specified user
 *
 * @async
 * @param {string|string[]} subdomains a single or list of subdomains to add emoji to. Must match respectively to `tokens`
 * @param {string|string[]} tokens a single or list of tokens to add emoji to. Must match respectively to `subdomains`
 * @param {object} options contains options on what to present
 * @param {Number} [options.top] count of top n emoji contriubtors you would like to retrieve user statistics on
 * @param {boolean} [options.bustCache] if `true`, ignore any adminList younger than 24 hours and repull slack instance's existing emoji. Can be useful for making `options.avoidCollisions` more accurate
 * @param {boolean} [options.output] if `false`, no files will be written during execution. Prevents saving of adminList for future use, as well as the writing of log files
 * @param {boolean} [options.verbose] if `true`, all messages will be written to stdout in addition to combined log file.
 *
 * @returns {Promise<favoritesResponseObject>} fovoritesResponseObject result object
 *
 * @example
var favoritesResults = await emojme.favorites('mySubdomain', 'myToken', {});
console.log(favoritesResults);
// {
//   mySubdomain: {
//     favoritesResults: [
//       {
//         user: '{myToken's user}',
//         favoriteEmoji: [
//            
//         ],
//         favoriteEmojiAdminList: [
//           {emojiName}: {adminList-style emoji object, with additional `usage` value}
//           ...
//         ],
//       }
//     ]
//   }
// }
 */
async function favorites(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};

  const [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  const favoritesPromises = authPairs.map(async (authPair) => {
    const emojiAdminList = new EmojiAdminList(...authPair, options.output);
    const emojiList = await emojiAdminList.get(options.bustCache);

    const bootClient = new ClientBoot(...authPair, options.output);
    const bootData = await bootClient.get(options.bustCache);
    const user = ClientBoot.extractName(bootData);
    const favoriteEmojiUsage = ClientBoot.extractEmojiUse(bootData);
    const favoriteEmoji = favoriteEmojiUsage.map(e => e.name);
    const favoriteEmojiAdminList = _.reduce(favoriteEmoji, (acc, usageObj) => {
      acc.push({
        [usageObj.name]: { ...EmojiAdminList.find(emojiList, usageObj.name), usage: usageObj.usage }
      });
      return acc;
    }, []);

    result = {
      user,
      favoriteEmoji,
      favoriteEmojiAdminList,
    }

    const safeUserName = result.user.toLowerCase().replace(/ /g, '-');
    debugger;
    if (options.output) FileUtils.writeJson(`./build/${safeUserName}.${bootClient.subdomain}.favorites.json`, result.favoriteEmojiAdminList, null, 3);

    const topNFavorites = util.inspect((options.usage ? favoriteEmoji : favoriteEmojiUsage).slice(0, options.top));
    logger.info(`[${bootClient.subdomain}] Favorite emoji for ${result.user}: ${topNFavorites}`);

    return { subdomain: bootClient.subdomain, favoritesResult: result };
  });

  return Helpers.formatResultsHash(_.flatten(await Promise.all(favoritesPromises)));
}

function favoritesCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program);
  program
    .option('--top <value>', 'the top n favorites you\'d like to see', 10)
    .option('--usage', 'print emoji usage of favorites in addition to their names', false)
    .parse(process.argv);

  return favorites(program.subdomain, program.token, {
    top: program.top,
    usage: program.usage,
    bustCache: program.bustCache,
    output: program.output,
  }).catch((err) => {
    console.error('An error occurred: ', err);
  });
}

if (require.main === module) {
  favoritesCli();
}

module.exports = {
  favorites,
  favoritesCli,
};
