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
  let adminList, authPairs, diffListsPromise, dstPairs, dstEmojiLists, emojiAdd, srcPairs, srcEmojiLists;

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

  srcPairs = _.zip(program.srcSubdomain, program.srcToken);
  dstPairs = _.zip(program.dstSubdomain, program.dstToken);
  authPairs = _.zip(program.subdomain, program.token).concat(srcPairs, dstPairs);

  if (program.download && hasValidSubdomainInputs(program)) {
    return Promise.all(authPairs.map(authPair => new EmojiAdminList(...authPair).get()));
  } else if (program.upload && hasValidSubdomainInputs(program)) {
    if (!program.src)
      return Promise.reject('Required option --src not specified');

    return Promise.all(authPairs.map(authPair => new EmojiAdd(...authPair).upload(program.src)));
  } else if (program.userStats && hasValidSubdomainInputs(program)) {
    return Promise.all(authPairs.map(authPair => {
      adminList = new EmojiAdminList(...authPair);
      return adminList.get()
        .then(emojiList => program.user ?
          adminList.summarizeUser(emojiList, program.user) :
          adminList.summarizeSubdomain(emojiList, program.top)
        )
    }));
  } else if (program.sync) {
    if (hasValidSubdomainInputs(program)) {
      if (program.subdomain.length < 2)
        return Promise.reject('Sync requires pairs of subdomain / token arguments');

      diffListsPromise = Promise.all(authPairs.map(authPair => new EmojiAdminList(...authPair).get()))
        .then(emojiLists => EmojiAdminList.diff(emojiLists, program.subdomain));
    } else if (hasValidSrcDstInputs(program)) {
      diffListsPromise = Promise.all([srcPairs, dstPairs].map(pairs => {
        return Promise.all(pairs.map(pair => new EmojiAdminList(...pair).get()))
      })).then(([srcEmojiLists, dstEmojiLists]) => EmojiAdminList.diff(
        srcEmojiLists,
        program.srcSubdomain,
        dstEmojiLists,
        program.dstSubdomain)
      );
    } else {
      Promise.reject('Invalid Sync parameters');
    }

    return diffListsPromise.then(diffList => {
      return Promise.all(diffList.map(diffObj => new EmojiAdd(
          diffObj.subdomain,
          _.find(authPairs, [0, diffObj.subdomain])[1]
        ).upload(diffObj.emojiList)
      ));
    });
  } else {
    Promise.reject('Invalid input');
  }
}

if (require.main === module) {
  main()
    .then(() => {console.log('Done.')})
    .catch((err) => { console.log(`Error: ${err}`) });
}
