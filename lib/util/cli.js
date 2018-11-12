function list(val, memo) {
  memo = memo || [];
  memo.push(val === '' ? null : val);
  return memo;
}

function increasable(val, memo) {
  return memo + 1;
}

function requireAuth(program) {
  return program
    .option('-s, --subdomain <value>', 'slack subdomain. Can be specified multiple times, paired with respective token.', list, [])
    .option('-t, --token <value>', 'slack user token. ususaly starts xoxp-... Can be specified multiple times, paired with respective subdomains.', list, []);
}

function allowEmojiAlterations(program) {
  return program
    .option('--avoid-collisions', 'instead of culling collisions, rename the emoji to be uploaded "intelligently"', false)
    .option('--prefix <value>', 'prefix all emoji to be uploaded with <value>');
}

function allowIoControl(program) {
  return program
    .option('-v, --verbose', 'Verbosity. 1 is dots and dashes, 2 is words and sentences', increasable, 0)
    .option('--bust-cache', 'force a redownload of all cached info.', false)
    .option('--no-output', 'prevent writing of files.');
}

module.exports = {
  list,
  requireAuth,
  allowIoControl,
  allowEmojiAlterations,
};
