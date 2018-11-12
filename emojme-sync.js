

const _ = require('lodash');
const commander = require('commander');

const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

const Cli = require('./lib/util/cli');
const FileUtils = require('./lib/util/file-utils');
const Helpers = require('./lib/util/helpers');

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
    verbose: program.verbose,
  });
}

if (require.main === module) {
  syncCli();
}

module.exports = {
  sync,
  syncCli,
};
