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

function main() {
  let adminList;

  program
    .version(require('./package').version)
    .option('download', 'download all emoji from given subdomain')
    .option('upload', 'upload source emoji to given subdomain')
    .option('user-stats', 'get emoji statistics for given user on given subdomain')
    .option('sync', 'get emoji statistics for given user on given subdomain')
    .option('-s, --subdomain [value]', 'slack subdomain. Can be specified multiple times, paired with respective token.', list, null)
    .option('-t, --token [value]', 'slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, null)
    .option('--src [value]', 'source file(s) for emoji json you\'d like to upload', list, null)
    .option('--user [value]', 'slack user you\'d like to get stats on. Can be specified multiple times for multiple users.', list, null)
    .option('--top [value]', 'the top n users you\'d like user emoji statistics on', 10)
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  if (!program.subdomain || !program.token || program.subdomain.length != program.token.length) {
    return Promise.reject('At least one subdomain/token pair is required');
  }

  let authPairs = _.zipWith(program.subdomain, program.token, (s, t) => {
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
    if (program.subdomain.length < 2 || program.subdomain.length != program.token.length) {
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
}

if (require.main === module) {
  main()
    .then(() => {console.log('Done.')})
    .catch((err) => { console.log(`Error: ${err}`) });
}
