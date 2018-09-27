const _ = require('lodash');
const program = require('commander');

function list(val, memo) {
  memo = memo || [];
  memo.push(val);
  return memo;
}

function hasValidSubdomainInputs(subdomains, tokens) {
  return subdomains && tokens && subdomains.length === tokens.length;
}

function hasValidSrcDstInputs(options) {
  return options.srcSubdomains && options.srcTokens &&
    options.dstSubdomains && options.dstTokens &&
    options.srcSubdomains.length === options.srcTokens.length &&
    options.dstSubdomains.length === options.dstTokens.length;
}

function requireAuth(prog) {
  return prog
    .option('-s, --subdomain <value>', '[upload/add/download/user-stats/sync] slack subdomain. Can be specified multiple times, paired with respective token.', list, null)
    .option('-t, --token <value>', '[upload/add/download/user-stats/sync] slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, null)
}

function zipAuthPairs(subdomains, tokens, options) {
  let srcPairs = [], dstPairs = [];
  let authPairs;

  if (options && options.srcSubdomains && options.srcTokens) {
    srcPairs = _.zip(options.srcSubdomains, options.srcTokens);
    dstPairs = _.zip(options.dstSubdomains, options.dstTokens);
  }
  authPairs = _.zip(subdomains, tokens).concat(srcPairs, dstPairs);

  return [authPairs, srcPairs, dstPairs];
}

module.exports = {
  list: list,
  hasValidSubdomainInputs: hasValidSubdomainInputs,
  hasValidSrcDstInputs: hasValidSrcDstInputs,
  requireAuth: requireAuth,
  zipAuthPairs: zipAuthPairs
};
