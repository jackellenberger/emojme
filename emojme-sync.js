'use strict';

const _ = require('lodash');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');
const Util = require('./lib/util');

if (require.main === module) {
  const program = require('commander');

  Util.requireAuth(program)
    .option('--src-subdomain [value]', 'subdomain from which to draw emoji for one way sync', Util.list, null)
    .option('--src-token [value]', 'token with which to draw emoji for one way sync', Util.list, null)
    .option('--dst-subdomain [value]', 'subdomain to which to emoji will be added is one way sync', Util.list, null)
    .option('--dst-token [value]', 'token with which emoji will be added for one way sync', Util.list, null)
    .option('--bust-cache', 'force a redownload of all cached info.')
    .option('--no-output', 'prevent writing of files.')
    .parse(process.argv)

  return sync(program.subdomain, program.token, {
    srcSubdomains: program.srcSubdomain,
    srcTokens: program.srcToken,
    dstSubdomains: program.dstSubdomain,
    dstTokens: program.dstToken,
    bustCache: program.bustCache,
    output: program.output
  });
}

async function sync(subdomains, tokens, options) {
  let uploadedDiffPromises;
  subdomains = _.castArray(subdomains);
  tokens = _.castArray(tokens);
  options = options || {};

  let [authPairs, srcPairs, dstPairs] = Util.zipAuthPairs(subdomains, tokens, options);

  if (subdomains.length < 1) {
    let emojiLists = authPairs.map(async authPair => {
      return await new EmojiAdminList(...authPair).get(options.bustCache);
    });

    let diffs = EmojiAdminList.diff(emojiLists, subdomains);
    uploadedDiffPromises = diffs.map(diffObj => {
      let emojiAdd = new EmojiAdd(diffObj.subdomain, _.find(authPairs, [0, diffObj.subdomain])[1]);
      return emojiAdd.upload(diffObj.emojiList);
    });
  } else if (srcPairs && dstPairs) {
    let srcDstPromises = [srcPairs, dstPairs].map(pairs =>
      Promise.all(pairs.map(async pair => {
        return await new EmojiAdminList(...pair).get(options.bustCache);
      }))
    );

    let [srcEmojiLists, dstEmojiLists] = await Promise.all(srcDstPromises);
    let diffs = EmojiAdminList.diff(srcEmojiLists, options.srcSubdomains, dstEmojiLists, options.dstSubdomains);
    uploadedDiffPromises = diffs.map(diffObj => {
      let emojiAdd = new EmojiAdd(diffObj.subdomain, _.find(authPairs, [0, diffObj.subdomain])[1]);
      return emojiAdd.upload(diffObj.emojiList);
    });
  } else {
    throw new Error('Invalid Input');
  }

  return Promise.all(uploadedDiffPromises);
}

module.exports.sync = sync;
