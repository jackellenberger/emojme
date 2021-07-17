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

beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('download', () => {
  const subdomains = ['subdomain1', 'subdomain2'];
  const tokens = ['token1', 'token2'];
  const cookies = ['cookie1', 'cookie2'];

  beforeEach(() => {
    const getStub = sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages');
    getStub.callsFake(() => Promise.resolve(specHelper.testEmojiList(10)));

    // prevent writing during tests
    sandbox.stub(FileUtils, 'saveData').callsFake((arg1, arg2) => Promise.resolve(arg2));
    sandbox.stub(FileUtils, 'mkdirp');
  });

  describe('downloads emojiList when save is not set', () => {
    const validateResults = ((results) => {
      assert.deepEqual(results.subdomain1.emojiList, specHelper.testEmojiList(10));
      assert.deepEqual(results.subdomain2.emojiList, specHelper.testEmojiList(10));

      assert.deepEqual(results.subdomain1.saveResults, []);
      assert.deepEqual(results.subdomain2.saveResults, []);
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
        '--cookie', 'cookie1',
        '--cookie', 'cookie2',
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => download(subdomains, tokens, cookies).then(validateResults));
  });

  describe('downloads emojiList containing only the emoji created since since_ts', () => {
    const validateResults = ((results) => {
      assert.equal(results.subdomain1.emojiList.length, 4);
      results.subdomain1.emojiList.forEach((emoji) => {
        assert.equal(emoji.created > 86400 * 5, true);
      });
      assert.equal(results.subdomain2.emojiList.length, 4);
      results.subdomain2.emojiList.forEach((emoji) => {
        assert.equal(emoji.created > 86400 * 5, true);
      });
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
        '--cookie', 'cookie1',
        '--cookie', 'cookie2',
        '--since', 86400 * 5, // 5 minutes from epoch
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => download(subdomains, tokens, cookies, { since: 86400 * 5 }).then(validateResults));
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
        '--cookie', 'cookie1',
        '--cookie', 'cookie2',
        '--save', 'test-user-1',
        '--save', 'test-user-0',
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => download(subdomains, tokens, cookies, { save: ['test-user-1', 'test-user-0'] }).then(validateResults));
  });

  describe('downloads emoji for all users to a single location when saveAll is set', () => {
    const validateResults = ((results) => {
      assert.deepEqual(results.subdomain.emojiList, specHelper.testEmojiList(10));

      assert.equal(results.subdomain.saveResults.length, 10);
      results.subdomain.saveResults.map(path => assert.match(path, /build\/subdomain\/emoji-[0-9]*.jpg/));
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--cookie', 'cookie',
        '--save-all',
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => {
      download('subdomain', 'token', 'cookie', { saveAll: true }).then(validateResults);
    });
  });

  describe('downloads emoji for all users to a user directories when saveAllByUser is set', () => {
    const validateResults = ((results) => {
      assert.deepEqual(results.subdomain.emojiList, specHelper.testEmojiList(10));

      assert.equal(results.subdomain.saveResults.length, 10);

      results.subdomain.saveResults.map(path => assert.match(path, /build\/subdomain\/test-user-[0-9]\/emoji-[0-9]*.jpg/));
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'download',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--cookie', 'cookie',
        '--save-all-by-user',
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => {
      download('subdomain', 'token', 'cookie', { saveAllByUser: true }).then(validateResults);
    });
  });
});
