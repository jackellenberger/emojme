const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));

const assert = chai.assert;

const commander = require('commander');

const downloadCli = require('../../emojme-download').downloadCli;

let subdomain; let token; let
  cookie;

before(() => {
  const program = new commander.Command();

  console.log('THIS WILL MAKE REAL REQUESTS AGAINST REAL SLACK. CONSIDER YOURSELF CHASTISED.');

  program
    .option('-s --subdomain <value>', 'slack subdomain for testing.')
    .option('-t --token <value>', 'slack token for testing.')
    .option('-c --cookie <value>', 'slack cookie for testing.')
    .parse(process.argv);

  subdomain = program.subdomain;
  token = program.token;
  cookie = program.cookie;
});

describe('emojme download', () => {
  it('fails when no authentication is specified', () => {
    process.argv = [
      'node',
      'emojme',
      'download',
    ];

    return downloadCli().then(() => {
      throw Error('FAIL you should not be able to use emojme without a subdomain and token.');
    }).catch((err) => {
      assert.equal(err.message, 'Invalid input. Ensure that every given "subdomain" has a matching "token" and "cookie"');
    });
  });

  it('downloads an emoji.adminList when authenticated', (done) => {
    // Note that for this to work you may need to increase timeout
    process.argv = [
      'node',
      'emojme',
      'download',
      '--subdomain', subdomain,
      '--token', token,
      '--cookie', cookie,
      '--verbose',
    ];

    return downloadCli().then(() => {
      // If we don't get an auth error, we're happy.
      done();
    });
  });
});
