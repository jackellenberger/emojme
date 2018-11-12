const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));

const assert = chai.assert;
const sinon = require('sinon');

const specHelper = require('../spec-helper');
const EmojiAdminList = require('../../lib/emoji-admin-list');
const FileUtils = require('../../lib/util/file-utils');
const download = require('../../emojme-download').download;
const downloadCli = require('../../emojme-download').downloadCli;

let sandbox;
let getStub;

beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('download', () => {
  const subdomains = ['subdomain1', 'subdomain2'];
  const tokens = ['token1', 'token2'];

  beforeEach(() => {
    getStub = sandbox.stub(EmojiAdminList.prototype, 'get');
    getStub.callsFake(() => Promise.resolve(specHelper.testEmojiList(10)));

    // prevent writing during tests
    sandbox.stub(FileUtils, 'saveData').callsFake((arg1, arg2) => Promise.resolve(arg2));
    sandbox.stub(FileUtils, 'mkdirp');
  });

  describe.only('verbosity settings', () => {
    const validateResults = ((results) => {
      // debugger;
    });

    it('does not output at verbosity 0', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain1',
        '--subdomain', 'subdomain2',
        '--token', 'token1',
        '--token', 'token2',
      ];
      return downloadCli().then(validateResults);
    });

    it('outputs a bit at verbosity 1', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain1',
        '--subdomain', 'subdomain2',
        '--token', 'token1',
        '--token', 'token2',
        '-v',
      ];
      return downloadCli().then(validateResults);
    });

    it('outputs a lot at verbosity 2', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain1',
        '--subdomain', 'subdomain2',
        '--token', 'token1',
        '--token', 'token2',
        '-v', '-v',
      ];
      return downloadCli().then(validateResults);
    });
  });

  describe('downloads emojiList when save is not set', () => {
    const validateResults = ((results) => {
      assert.deepEqual(results.subdomain1.emojiList, specHelper.testEmojiList(10));
      assert.deepEqual(results.subdomain2.emojiList, specHelper.testEmojiList(10));

      assert.deepEqual(results.subdomain1.saveResults, undefined);
      assert.deepEqual(results.subdomain2.saveResults, undefined);
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain1',
        '--subdomain', 'subdomain2',
        '--token', 'token1',
        '--token', 'token2',
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => download(subdomains, tokens).then(validateResults));
  });

  describe('downloads emoji for specified users when save is set', () => {
    const validateResults = ((results) => {
      assert.deepEqual(results.subdomain1.emojiList, specHelper.testEmojiList(10));
      assert.deepEqual(results.subdomain2.emojiList, specHelper.testEmojiList(10));

      assert.equal(results.subdomain1.saveResults.length, 10);
      assert.equal(results.subdomain2.saveResults.length, 10);
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain1',
        '--subdomain', 'subdomain2',
        '--token', 'token1',
        '--token', 'token2',
        '--save', 'test-user-1',
        '--save', 'test-user-0',
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => download(subdomains, tokens, { save: ['test-user-1', 'test-user-0'] }).then(validateResults));
  });
});
