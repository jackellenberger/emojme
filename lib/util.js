const _ = require('lodash');
const program = require('commander');

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

function requireAuth(prog) {
  return prog
    .option('-s, --subdomain <value>', '[upload/add/download/user-stats/sync] slack subdomain. Can be specified multiple times, paired with respective token.', list, null)
    .option('-t, --token <value>', '[upload/add/download/user-stats/sync] slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, null)
}

function zipAuthPairs(program) {
  let ret = {};
  ret.srcPairs = _.zip(program.srcSubdomain, program.srcToken);
  ret.dstPairs = _.zip(program.dstSubdomain, program.dstToken);
  ret.authPairs = _.zip(program.subdomain, program.token).concat(ret.srcPairs, ret.dstPairs);

  return ret;
}

module.exports = {
  list: list,
  hasValidSubdomainInputs: hasValidSubdomainInputs,
  hasValidSrcDstInputs: hasValidSrcDstInputs,
  requireAuth: requireAuth,
  zipAuthPairs: zipAuthPairs
};
