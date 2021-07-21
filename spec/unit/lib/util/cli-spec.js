const chai = require('chai');

const assert = chai.assert;
const commander = require('commander');
const Cli = require('../../../../lib/util/cli');

describe('Cli', () => {
  describe('unpackAuthJson', () => {
    let program;

    beforeEach(() => {
      program = new commander.Command();
      Cli.requireAuth(program);
    });

    it('is ignored if no auth json is specified', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--cookie', 'cookie',
        '--auth-json', '{}',
      ];

      program.parse(process.argv);

      Cli.unpackAuthJson(program);
      assert.deepEqual(program.subdomain, ['subdomain']);
      assert.deepEqual(program.token, ['token']);
      assert.deepEqual(program.cookie, ['cookie']);
    });

    it('is can be used once, alone', () => {
      process.argv = [
        'node',
        'emojme',
        'download', // arbitrary
        '--auth-json', '{"subdomain":"subdomain", "token":"token", "cookie":"cookie"}',
      ];

      program.parse(process.argv);

      Cli.unpackAuthJson(program);
      assert.deepEqual(program.subdomain, ['subdomain']);
      assert.deepEqual(program.token, ['token']);
      assert.deepEqual(program.cookie, ['cookie']);
    });

    it('can be used repeatedly', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--auth-json', '{"subdomain":"subdomain1", "token":"token1", "cookie":"cookie1"}',
        '--auth-json', '{"subdomain":"subdomain2", "token":"token2", "cookie":"cookie2"}',
      ];

      program.parse(process.argv);

      Cli.unpackAuthJson(program);
      assert.deepEqual(program.subdomain, ['subdomain1', 'subdomain2']);
      assert.deepEqual(program.token, ['token1', 'token2']);
      assert.deepEqual(program.cookie, ['cookie1', 'cookie2']);
    });

    it('can be used in conjunction with --subdomain, --token, and --cookie flags', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain1',
        '--token', 'token1',
        '--cookie', 'cookie1',
        '--auth-json', '{"subdomain":"subdomain2", "token":"token2", "cookie":"cookie2"}',
        '--subdomain', 'subdomain3',
        '--token', 'token3',
        '--cookie', 'cookie3',
      ];

      program.parse(process.argv);

      Cli.unpackAuthJson(program);
      assert.deepEqual(program.subdomain, ['subdomain1', 'subdomain3', 'subdomain2']);
      assert.deepEqual(program.token, ['token1', 'token3', 'token2']);
      assert.deepEqual(program.cookie, ['cookie1', 'cookie3', 'cookie2']);
    });
  });
});
