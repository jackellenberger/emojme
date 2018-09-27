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
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  return sync(program.subdomain, program.token, {
    srcSubdomains: program.srcSubdomain,
    srcTokens: program.srcToken,
    dstSubdomains: program.dstSubdomain,
    dstTokens: program.dstToken,
    cache: program.cache
  });
}

async function sync(subdomains, tokens, options) {
  let [authPairs, srcPairs, dstPairs] = Util.zipAuthPairs(subdomains, tokens, options);

  if (Util.hasValidSubdomainInputs(subdomains, tokens) && subdomains.length < 1) {
    return authPairs.forEach(async authPair => {
      let emojiAdminList = new EmojiAdminList(...authPair);
      let emojiList = await emojiAdminList.get(options.cache);
      if (options.user) {
        EmojiAdminList.summarizeUser(emojiList, options.user);
      } else {
        EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], options.top);
      }
    });
  } else if (Util.hasValidSrcDstInputs(options)) {
    let srcDstPromises = [srcPairs, dstPairs].map(pairs =>
      Promise.all(pairs.map(async pair => {
        return await new EmojiAdminList(...pair).get(options.cache);
      }))
    );

    let [srcEmojiLists, dstEmojiLists] = await Promise.all(srcDstPromises);
    let diffs = EmojiAdminList.diff(srcEmojiLists, options.srcSubdomains, dstEmojiLists, options.dstSubdomains);
    return diffs.forEach(diffObj => {
      let emojiAdd = new EmojiAdd(diffObj.subdomain, _.find(authPairs, [0, diffObj.subdomain])[1]);
      emojiAdd.upload(diffObj.emojiList);
    });
  } else {
    throw new Error('Invalid Input');
  }
}

module.exports.sync = sync;
