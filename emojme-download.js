const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');

const Cli = require('./lib/util/cli');
const Helpers = require('./lib/util/helpers');
/** @module download */

/**
 * The download response object, like other response objects, is organized by input subdomain.
 * @typedef {object} downloadResponseObject
 * @property {object} subdomain each subdomain passed in to add will appear as a key in the response
 * @property {emojiList[]} subdomain.emojiList the list of emoji downloaded from `subdomain`
 * @property {string[]} subdomain.saveResults an array of paths for emoji that have been downloaded. note that all users that have been passed with `options.save` will be grouped together here.
 */

/**
 * Download the list of custom emoji that have been added to the given slack instances, by default saving a json of all available relevant data. Optionally save the source images for a given user.
 *
 * @async
 * @param {string|string[]} subdomains a single or list of subdomains to add emoji to. Must match respectively to `tokens`
 * @param {string|string[]} tokens a single or list of tokens to add emoji to. Must match respectively to `subdomains`
 * @param {object} options contains singleton or arrays of emoji descriptors.
 * @param {string} [options.since] The oldest age of the emoji you would like to download, specified in the [ISO-6801 duration format](https://en.wikipedia.org/wiki/ISO_8601#Durations). Defaults to no limit.
 * @param {string|string[]} [options.save] A user name or array of user names whose emoji source images will be saved. All emoji source images are linked to in the default adminList, but passing a user name here will save that user's emoji to build/<subdomain>/<username>
 * @param {boolean} [options.saveAll] if `true`, download all emoji on slack instance from all users to disk in a single location.
 * @param {boolean} [options.saveAllByUser] if `true`, download all emoji on slack instance from all users to disk, organized into directories by user.
 * @param {boolean} [options.bustCache] if `true`, ignore any adminList younger than 24 hours and repull slack instance's existing emoji. Can be useful for making `options.avoidCollisions` more accurate
 * @param {boolean} [options.output] if `false`, no files will be written during execution. Prevents saving of adminList for future use, as well as the writing of log files
 * @param {boolean} [options.verbose] if `true`, all messages will be written to stdout in addition to combined log file.
 *
 * @returns {Promise<downloadResponseObject>} downloadResponseObject result object
 *
 * @example
var downloadOptions = {
  save: ['username_1', 'username_2'], // Download the emoji source files for these two users
  since: "PT1H30M", // Download the emoji created within the past 1.5 hours
  bustCache: true, // make sure this data is fresh
  output: true // download the adminList to ./build
};
var downloadResults = await emojme.download('mySubdomain', 'myToken', downloadOptions);
console.log(downloadResults);
// {
//   mySubdomain: {
//     emojiList: [
//       { name: 'emoji-from-mySubdomain', ... },
//       ...
//     ],
//     saveResults: [
//       './build/mySubdomain/username_1/an_emoji.jpg',
//       './build/mySubdomain/username_1/another_emoji.gif',
//       ... all of username_1's emoji
//       './build/mySubdomain/username_2/some_emoji.jpg',
//       './build/mySubdomain/username_2/some_other_emoji.gif',
//       ... all of username_2's emoji
//     ]
//   }
// }
 */
async function download(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};

  const [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  const downloadPromises = authPairs.map(async (authPair) => {
    const subdomain = authPair[0];
    let saveResults = [];

    const adminList = new EmojiAdminList(...authPair, options.output);
    const emojiList = await adminList.get(options);
    if ((options.save && options.save.length) || options.saveAll || options.saveAllByUser) {
      saveResults = saveResults.concat(await EmojiAdminList.save(emojiList, subdomain, {
        save: options.save, saveAll: options.saveAll, saveAllByUser: options.saveAllByUser,
      }));
    }

    return { emojiList, subdomain, saveResults };
  });

  return Helpers.formatResultsHash(await Promise.all(downloadPromises));
}
function downloadCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program);
  Cli.allowSinceDurationControl(program);
  program
    .option('--save <user>', 'save all of <user>\'s emoji to disk at build/$subdomain/$user', Cli.list, [])
    .option('--save-all', 'save all emoji from all users to disk at build/$subdomain')
    .option('--save-all-by-user', 'save all emoji from all users to disk at build/$subdomain/$user')
    .parse(process.argv);

  return download(program.subdomain, program.token, {
    save: program.save,
    saveAll: program.saveAll,
    saveAllByUser: program.saveAllByUser,
    since: program.since,
    bustCache: program.bustCache,
    output: program.output,
  });
}

if (require.main === module) {
  downloadCli();
}

module.exports = {
  download,
  downloadCli,
};
