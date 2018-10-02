const _ = require('lodash');
const program = require('commander');

function list(val, memo) {
  memo = memo || [];
  memo.push(val);
  return memo;
}

function requireAuth(prog) {
  return prog
    .option('-s, --subdomain <value>', '[upload/add/download/user-stats/sync] slack subdomain. Can be specified multiple times, paired with respective token.', list, [])
    .option('-t, --token <value>', '[upload/add/download/user-stats/sync] slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, [])
}

function validAuthPairs(subdomains, tokens) {
  return subdomains.length === tokens.length;
}

function validSrcDstPairs(options) {
  return options.srcSubdomains
    && options.srcTokens
    && (options.srcSubdomains.length === options.srcTokens.length)
    && options.dstSubdomains
    && options.dstTokens
    && options.dstSubdomains.length === options.dstTokens.length;
}

function atLeastOneValidInputType(subdomains, tokens, options) {
  return (validAuthPairs(subdomains, tokens) && subdomains.length > 0) || (validSrcDstPairs(options) && options.srcSubdomains.length > 0 && options.dstSubdomains.length > 0);
}

function zipAuthPairs(subdomains, tokens, options) {
  let srcPairs = [], dstPairs = [];
  let authPairs;

  if (options && options.srcSubdomains && options.srcTokens) {
    srcPairs = _.zip(options.srcSubdomains, options.srcTokens);
    dstPairs = _.zip(options.dstSubdomains, options.dstTokens);
  }

  authPairs = _.uniq(_.zip(subdomains, tokens).concat(srcPairs, dstPairs));

  if (!atLeastOneValidInputType(subdomains, tokens, options)) {
    throw new Error('Invalid input. Ensure that every given "subdomain" has a matching "token"');
  }

  return [authPairs, srcPairs, dstPairs];
}

module.exports = {
  list: list,
  requireAuth: requireAuth,
  zipAuthPairs: zipAuthPairs
};
