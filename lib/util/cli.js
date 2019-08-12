const logger = require('../logger');

function list(val, memo) {
  memo = memo || [];
  memo.push(val === '' ? null : val);
  return memo;
}

function verbosity() {
  logger.transports[0].level = 'debug';
}

function requireAuth(program) {
  return program
    .option('-s, --subdomain <value>', 'slack subdomain. Can be specified multiple times, paired with respective token.', list, [])
    .option('-t, --token <value>', 'slack user token. ususaly starts xox*-... Can be specified multiple times, paired with respective subdomains.', list, []);
}

function allowEmojiAlterations(program) {
  return program
    .option('--avoid-collisions', 'instead of culling collisions, rename the emoji to be uploaded "intelligently"', false)
    .option('--prefix <value>', 'prefix all emoji to be uploaded with <value>');
}

function allowIoControl(program) {
  return program
    .option('--bust-cache', 'force a redownload of all cached info.', false)
    .option('--no-output', 'prevent writing of files in build/ and log/')
    .option('--verbose', 'log debug messages to console', verbosity);
}

function allowSinceDurationControl(program) {
  return program
    .option('--since <value>', 'query only those emoji created since <ISO-8601 duration>');
}

module.exports = {
  list,
  requireAuth,
  allowIoControl,
  allowEmojiAlterations,
  allowSinceDurationControl,
};
