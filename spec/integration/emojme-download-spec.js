const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const assert = chai.assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

let specHelper = require('../spec-helper');
let EmojiAdd = require('../../lib/emoji-add');
let EmojiAdminList = require('../../lib/emoji-admin-list');
let SlackClient = require('../../lib/slack-client');
let FileUtils = require('../../lib/util/file-utils');
let download = require('../../emojme-download').download;
let downloadCli = require('../../emojme-download').downloadCli;

let sandbox;
let getStub;
let saveDataStub;

beforeEach(() => {
  sandbox = sinon.createSandbox();
  let requestStub = sandbox.stub(SlackClient.prototype, 'request')
  requestStub.withArgs(sinon.match.any).resolves(
    { ok: true }
  );
});

afterEach(() => {
  sandbox.restore();
});

describe('download', () => {
  let subdomains = ['subdomain1', 'subdomain2'];
  let tokens = ['token1', 'token2'];

  beforeEach(() => {
    getStub = sandbox.stub(EmojiAdminList.prototype, 'get');
    getStub.callsFake(() => {
      return Promise.resolve(specHelper.testEmojiList(10));
    });

    // prevent writing during tests
    sandbox.stub(FileUtils, 'saveData').callsFake((arg1, arg2) => Promise.resolve(arg2));
    sandbox.stub(FileUtils, 'mkdirp');
  });

  describe('downloads emojiList when save is not set', () => {
    let validateResults = (results => {
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

    it('using the module', () => {
      return download(subdomains, tokens).then(validateResults);
    });
  });

  describe('downloads emoji for specified users when save is set', () => {
    let validateResults = (results => {
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
        '--save', 'test-user-0'
      ];
      return downloadCli().then(validateResults);
    });

    it('using the module', () => {
      return download(subdomains, tokens, {save: ['test-user-1', 'test-user-0']}).then(validateResults);
    });
  });
});
