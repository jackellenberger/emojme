const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const assert = chai.assert;

const commander = require('commander');

const downloadCli = require('../../emojme-download').downloadCli;

var subdomain, token;

before(() => {
  const program = new commander.Command();

  console.log('THIS WILL MAKE REAL REQUESTS AGAINST REAL SLACK. CONSIDER YOURSELF CHASTISED.')

  program
    .option('-s --subdomain <value>', 'slack subdomain for testing.')
    .option('-t --token <value>', 'slack user token for testing.')
    .parse(process.argv);

  subdomain = program.subdomain;
  token = program.token;
});

describe('emojme download', () => {
  it('fails when no authentication is specified', () => {
    process.argv = [
      'node',
      'emojme',
      'download',
    ];

    return downloadCli().then(() => {
      throw 'FAIL you should not be able to use emojme without a subdomain and token.';
    }).catch((err) => {
      assert.equal(err.message, 'Invalid input. Ensure that every given "subdomain" has a matching "token"');
    });
  });

  it('downloads an emoji.adminList when authenticated', () => {
    process.argv = [
      'node',
      'emojme',
      'download',
      '--subdomain', subdomain,
      '--token', token,
    ];
    debugger;

    return downloadCli().then((results) => {
      debugger;
      console.log(results);
    });
  });
});
