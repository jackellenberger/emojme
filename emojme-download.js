const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');

const Cli = require('./lib/util/cli');
const Helpers = require('./lib/util/helpers');

async function download(subdomains, tokens, options) {
  subdomains = Helpers.arrayify(subdomains);
  tokens = Helpers.arrayify(tokens);
  options = options || {};

  const [authPairs] = Helpers.zipAuthPairs(subdomains, tokens);

  const downloadPromises = authPairs.map(async (authPair) => {
    const subdomain = authPair[0];
    let saveResults;

    const adminList = new EmojiAdminList(...authPair, options.output);
    const emojiList = await adminList.get(options.bustCache);
    if (options.save && options.save.length) {
      saveResults = await EmojiAdminList.save(emojiList, subdomain, options.save);
    }

    return { emojiList, subdomain, saveResults };
  });

  return Helpers.formatResultsHash(await Promise.all(downloadPromises));
}
function downloadCli() {
  const program = new commander.Command();

  Cli.requireAuth(program);
  Cli.allowIoControl(program)
    // TODO: re-add --user option to save user admin list without getting stats or saving to disk
    .option('--save <user>', 'save all of <user>\'s emoji to disk. specify "all" to save all emoji.', Cli.list, [])
    .parse(process.argv);

  return download(program.subdomain, program.token, {
    user: program.user,
    save: program.save,
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
