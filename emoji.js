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

function main() {
  let adminList, authPairs;

  program
    .version(require('./package').version)
    .option('download', 'download all emoji from given subdomain')
    .option('upload', 'upload source emoji to given subdomain')
    .option('user-stats', 'get emoji statistics for given user on given subdomain')
    .option('sync', 'get emoji statistics for given user on given subdomain')
    .option('-s, --subdomain [value]', 'slack subdomain. Can be specified multiple times, paired with respective token.', list, null)
    .option('-t, --token [value]', 'slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, null)
    .option('--src [value]', 'source file(s) for emoji json you\'d like to upload', list, null)
    .option('--src-subdomain [value]', 'subdomain from which to draw emoji for one way sync', list, null)
    .option('--src-token [value]', 'token with which to draw emoji for one way sync', list, null)
    .option('--dst-subdomain [value]', 'subdomain to which to emoji will be added is one way sync', list, null)
    .option('--dst-token [value]', 'token with which emoji will be added for one way sync', list, null)
    .option('--user [value]', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', list, null)
    .option('--top [value]', 'the top n users you\'d like user emoji statistics on', 10)
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  if (hasValidSubdomainInputs(program)) {
    authPairs = _.zipWith(program.subdomain, program.token, (s, t) => {
      return {subdomain: s, token: t};
    });

    if (program.download) {
      return Promise.all(authPairs.map((authPair) => {
        adminList = new EmojiAdminList(authPair.subdomain, authPair.token);
        return adminList.get();
      }));
    }

    if (program.upload) {
      if (!program.src) {
        return Promise.reject('Required option --src not specified');
      }
      return Promise.all(authPairs.map((authPair) => {
        emojiAdd = new EmojiAdd(authPair.subdomain, authPair.token);
        return emojiAdd.upload(program.src);
      }));
    }

    if (program.userStats) {
      return Promise.all(authPairs.map((authPair) => {
        adminList = new EmojiAdminList(authPair.subdomain, authPair.token);
        return adminList.get().then(emojiList => {
          //TODO: update summarizeUser to take single user for consistency?
          if (program.user) {
            adminList.summarizeUser(emojiList, program.user);
          } else {
            adminList.summarizeSubdomain(emojiList, program.top);
          }
        });
      }));
    }

    if (program.sync) {
      if (program.subdomain.length < 2) {
        return Promise.reject('Sync requires pairs of subdomain / token arguments');
      }

      return Promise.all(authPairs.map((authPair) => {
        adminList = new EmojiAdminList(authPair.subdomain, authPair.token);
        return adminList.get();
      })).then((lists) => {
        let diffsToUpload = EmojiAdminList.diff(lists, program.subdomain);
        Promise.resolve(diffsToUpload);
      });
    }
  } else if (hasValidSrcDstInputs(program)){
    if (program.sync) {

      let srcPairs = _.zipWith(program.srcSubdomain, program.srcToken, (s, t) => {
        return {subdomain: s, token: t};
      });
      let dstPairs = _.zipWith(program.dstSubdomain, program.dstToken, (s, t) => {
        return {subdomain: s, token: t};
      });

      return Promise.all([srcPairs, dstPairs].map((pairs) => {
        return Promise.all(pairs.map(pair => {
          adminList = new EmojiAdminList(pair.subdomain, pair.token);
          return adminList.get();
        }))
      })).then(srcDstList => {
        let srcEmojiLists = srcDstList[0];
        let dstEmojiLists = srcDstList[1];
        let diffsToUpload = EmojiAdminList.oneWayDiff(srcEmojiLists, program.srcSubdomain, dstEmojiLists, program.dstSubdomain);

        Promise.resolve(diffsToUpload);
      });
    }

  } else {
    return Promise.reject('At least one subdomain/token pair is required');
  }
}

if (require.main === module) {
  main()
    .then(() => {console.log('Done.')})
    .catch((err) => { console.log(`Error: ${err}`) });
}
