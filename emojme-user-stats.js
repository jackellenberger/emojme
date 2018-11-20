const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');

const Cli = require('./lib/util/cli');
const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');
/** @module userStats */

/**
 * The user-specific userStats response object, like other response objects, is organized by input subdomain.
 * @typedef {object} userStatsResponseObject
 * @property {object} subdomain each subdomain passed in to add will appear as a key in the response
 * @property {emojiList[]} subdomain.emojiList the list of emoji downloaded from `subdomain`
 * @property {object[]} subdomain.userStatsResults an array of user stats objects
 * @property {object} subdomain.userStatsResults.userStatsObject An object containing several maybe-useful statistics, separated by user
 * @property {string} subdomain.userStatsResults.userStatsObject.user the name of the user in question
 * @property {emojiList[]} subdomain.userStatsResults.userStatsObject.userEmoji the emojiList the user authored
 * @property {string} subdomain.userStatsResults.userStatsObject.subdomain redundant :shrug:
 * @property {Number} subdomain.userStatsResults.userStatsObject.originalCount the number of original emoji the user has created
 * @property {Number} subdomain.userStatsResults.userStatsObject.aliasCount the number of emoji aliases the user has defined
 * @property {Number} subdomain.userStatsResults.userStatsObject.totalCount the number of original and aliases the user has created
 * @property {Number} subdomain.userStatsResults.userStatsObject.percentage the percentage of emoji in the given subdomain that the user is responsible for
 */

/**
 * Get a few useful-ish statistics for either specific users, or the top-n emoji creators
 *
 * @async
 * @param {string|string[]} subdomains a single or list of subdomains to add emoji to. Must match respectively to `tokens`
 * @param {string|string[]} tokens a single or list of tokens to add emoji to. Must match respectively to `subdomains`
 * @param {object} options contains singleton or arrays of emoji descriptors.
 * @param {string|string[]} [options.user] user name or array of user names you would like to retrieve user statistics on. If specified, ignores `top`
 * @param {Number} [options.top] count of top n emoji contriubtors you would like to retrieve user statistics on
 * @param {boolean} [options.bustCache] if `true`, ignore any adminList younger than 24 hours and repull slack instance's existing emoji. Can be useful for making `options.avoidCollisions` more accurate
 * @param {boolean} [options.output] if `false`, no files will be written during execution. Prevents saving of adminList for future use
 *
 * @returns {Promise<userStatsResponseObject>} userStatsResponseObject result object
 *
 * @example
var userStatsOptions = {
  user: ['username_1', 'username_2'] // get me some info on these two users
};
var userStatsResults = await emojme.userStats('mySubdomain', 'myToken', userStatsOptions);
console.log(userStatsResults);
// {
//   mySubdomain: {
//     userStatsResults: [
//       {
//         user: 'username_1',
//         userEmoji: [{ all username_1's emoji }],
//         subdomain: mySubdomain,
//         originalCount: x,
//         aliasCount: y,
//         totalCount: x + y,
//         percentage: (x + y) / mySubdomain's total emoji count
//       },
//       {
//         user: 'username_2',
//         userEmoji: [{ all username_2's emoji }],
//         subdomain: mySubdomain,
//         originalCount: x,
//         aliasCount: y,
//         totalCount: x + y,
//         percentage: (x + y) / mySubdomain's total emoji count
//       }
//     ]
//   }
// }
 */
async function userStats(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  const users = Helpers.arrayify(options.user);
  options = options || {};

  const [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  const userStatsPromises = authPairs.map(async (authPair) => {
    const emojiAdminList = new EmojiAdminList(...authPair, options.output);
    const emojiList = await emojiAdminList.get(options.bustCache);
    if (users && users.length > 0) {
      const results = EmojiAdminList.summarizeUser(emojiList, authPair[0], users);
      return results.map((result) => {
        const safeUserName = result.user.toLowerCase().replace(/ /g, '-');
        FileUtils.writeJson(`./build/${safeUserName}.${result.subdomain}.adminList.json`, result.userEmoji, null, 3);
        return { subdomain: authPair[0], userStatsResults: results, emojiList };
      });
    }
    const results = EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], options.top);
    results.forEach((result) => {
      const safeUserName = result.user.toLowerCase().replace(/ /g, '-');
      FileUtils.writeJson(`./build/${safeUserName}.${result.subdomain}.adminList.json`, result.userEmoji, null, 3);
    });

    return { subdomain: authPair[0], userStatsResults: results, emojiList };
  });

  return Helpers.formatResultsHash(_.flatten(await Promise.all(userStatsPromises)));
}

function userStatsCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program)
    .option('--user <value>', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', Cli.list, null)
    .option('--top <value>', 'the top n users you\'d like user emoji statistics on', 10)
    .parse(process.argv);

  return userStats(program.subdomain, program.token, {
    user: program.user,
    top: program.top,
    bustCache: program.bustCache,
    output: program.output,
  });
}

if (require.main === module) {
  userStatsCli();
}

module.exports = {
  userStats,
  userStatsCli,
};
