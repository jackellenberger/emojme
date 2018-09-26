#!/usr/bin/env node
"use strict";

const _ = require('lodash');
const program = require('commander');
const EmojiAdminList = require('./lib/emoji-admin-list');
const EmojiAdd = require('./lib/emoji-add');

function list(val, memo) {
  memo = memo || [];
  memo.push(val);
  return memo;
}

function hasValidSubdomainInputs(program) {
  return program.subdomain && program.token && program.subdomain.length === program.token.length;
}

function hasValidSrcDstInputs(program) {
  return program.srcSubdomain && program.srcToken &&
    program.dstSubdomain && program.dstToken &&
    program.srcSubdomain.length === program.srcToken.length &&
    program.dstSubdomain.length === program.dstToken.length;
}

async function main() {
  let adminList, authPairs, diffListsPromise, dstPairs, dstEmojiLists, emojiAdd, srcPairs, srcEmojiLists;

  program
    .version(require('./package').version)
    .command('download', 'download all emoji from given subdomain')
    .command('upload', 'upload source emoji to given subdomain')
    .command('add', 'upload source emoji to given subdomain')
    .command('user-stats', 'get emoji statistics for given user on given subdomain')
    .command('sync', 'get emoji statistics for given user on given subdomain')
    // .option('-s, --subdomain [value]', '[upload/add/download/user-stats/sync] slack subdomain. Can be specified multiple times, paired with respective token.', list, null)
    // .option('-t, --token [value]', '[upload/add/download/user-stats/sync] slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, null)
    // .option('--src [value]', '[upload, add] source file(s) for emoji json you\'d like to upload', list, null)
    // .option('--name [value]', '[add] name of the emoji from --src that you\'d like to upload', list, null)
    // .option('--alias-for [value]', '[add] name of the emoji you\'d like --name to be an alias of. Specifying this will negate --src', list, null)
    // .option('--src-subdomain [value]', '[sync] subdomain from which to draw emoji for one way sync', list, null)
    // .option('--src-token [value]', '[sync] token with which to draw emoji for one way sync', list, null)
    // .option('--dst-subdomain [value]', '[sync] subdomain to which to emoji will be added is one way sync', list, null)
    // .option('--dst-token [value]', '[sync] token with which emoji will be added for one way sync', list, null)
    // .option('--user [value]', '[download, user-stats] slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', list, null)
    // .option('--top [value]', '[user-stats] the top n users you\'d like user emoji statistics on', 10)
    // .option('--save', '[download] create local files of the given subdomain\s emoji')
    // .option('--no-cache', '[download/user-stats/sync] force a redownload of all cached info.')
    .parse(process.argv)

  // srcPairs = _.zip(program.srcSubdomain, program.srcToken);
  // dstPairs = _.zip(program.dstSubdomain, program.dstToken);
  // authPairs = _.zip(program.subdomain, program.token).concat(srcPairs, dstPairs);
  //
  // if (hasValidSubdomainInputs(program)) {
  //   if (program.download) {
  //     return authPairs.forEach(async authPair => {
  //       let adminList = new EmojiAdminList(...authPair);
  //       let emojiList = await adminList.get(program.cache);
  //       if (program.save)
  //         await EmojiAdminList.save(emojiList, authPair[0], program.user);
  //     });
  //   } else if (program.add) {
  //     if (!program.src && !(program.name && program.aliasFor)) throw new Error('Required option not specified: provide either --src and optionally --name or --name and --alias-for');
  //
  //     return authPairs.forEach(async authPair => {
  //       let srcEmojiList;
  //       let emojiAdd = new EmojiAdd(...authPair);
  //
  //       if (program.aliasFor) {
  //         srcEmojiList = _.zipWith(program.name, program.aliasFor, (name, aliasFor) => {
  //           return {
  //             is_alias: 1,
  //             name: name,
  //             alias_for: aliasFor
  //           }
  //         });
  //       } else {
  //         srcEmojiList = _.zipWith(program.src, program.name, (src, name) => {
  //           return {
  //             is_alias: 0,
  //             name: name ? name : src.match(/(?:.*\/)?(.*).(jpg|jpeg|png|gif)/)[1],
  //             url: src
  //           }
  //         });
  //       }
  //       await emojiAdd.upload(srcEmojiList);
  //     });
  //   } else if (program.upload) {
  //     if (!program.src) throw new Error('Required option --src not specified');
  //
  //     return authPairs.forEach(async authPair => {
  //       let emojiAdd = new EmojiAdd(...authPair);
  //       await emojiAdd.upload(program.src);
  //     });
  //   } else if (program.userStats) {
  //     return authPairs.forEach(async authPair => {
  //       let emojiAdminList = new EmojiAdminList(...authPair);
  //       let emojiList = await emojiAdminList.get(program.cache);
  //       if (program.user) {
  //           EmojiAdminList.summarizeUser(emojiList, program.user);
  //       } else {
  //           EmojiAdminList.summarizeSubdomain(emojiList, authPair[0], program.top);
  //       }
  //     });
  //   } else if (program.sync) {
  //     if (program.subdomain.length < 2)
  //       throw new Error('Sync requires pairs of subdomain / token arguments');
  //
  //     let emojiLists = authPairs.map(async authPair => {
  //       return await new EmojiAdminList(...authPair).get(program.cache);
  //     });
  //
  //     let diffs = EmojiAdminList.diff(emojiLists, program.subdomain);
  //     return diffs.forEach(diffObj => {
  //       let emojiAdd = new EmojiAdd(diffObj.subdomain, _.find(authPairs, [0, diffObj.subdomain])[1]);
  //       emojiAdd.upload(diffObj.emojiList);
  //     });
  //   }
  // } else if (hasValidSrcDstInputs(program)) {
  //   if (program.sync) {
  //     let srcDstPromises = [srcPairs, dstPairs].map(pairs =>
  //         Promise.all(pairs.map(async pair => {
  //           return await new EmojiAdminList(...pair).get(program.cache);
  //         })
  //       )
  //     );
  //
  //     [srcEmojiLists, dstEmojiLists] = await Promise.all(srcDstPromises);
  //     let diffs = EmojiAdminList.diff(srcEmojiLists, program.srcSubdomain, dstEmojiLists, program.dstSubdomain);
  //     return diffs.forEach(diffObj => {
  //       let emojiAdd = new EmojiAdd(diffObj.subdomain, _.find(authPairs, [0, diffObj.subdomain])[1]);
  //       emojiAdd.upload(diffObj.emojiList);
  //     });
  //   }
  // }
  //
  // program.help();
}

if (require.main === module) {
  (async function() {
    try {
      await main();
    } catch(err) {
      console.log(`Encountered error: ${err.stack}`);
    }
  })();
}
