const assert = require('chai').assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

let specHelper = require('../spec-helper');
let EmojiAdd = require('../../lib/emoji-add');
let EmojiAdminList = require('../../lib/emoji-admin-list');
let SlackClient = require('../../lib/slack-client');
let FileUtils = require('../../lib/util/file-utils');
let download = require('../../emojme-download').download;

let sandbox;
let getStub;
let saveDataStub;

beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('download', () => {
  let subdomains = ['subdomain1', 'subdomain2'];
  let tokens = ['token1', 'token2'];

  beforeEach(() => {
    getStub = sandbox.stub(EmojiAdminList.prototype, 'get');
    getStub.resolves(
      specHelper.testEmojiList(10)
    );

    // prevent writing during tests
    sandbox.stub(FileUtils, 'saveData').callsFake((arg1, arg2) => Promise.resolve(arg2));
    sandbox.stub(FileUtils, 'mkdirp');
  });

  it('downloads emojiList when save is not set', () => {
    return download(subdomains, tokens).then(results => {
      assert.deepEqual(results.subdomain1.emojiList, specHelper.testEmojiList(10));
      assert.deepEqual(results.subdomain2.emojiList, specHelper.testEmojiList(10));

      assert.deepEqual(results.subdomain1.saveResults, undefined);
      assert.deepEqual(results.subdomain2.saveResults, undefined);
    });
  });

  it('downloads emoji for specified users when save is set', () => {
    return download(subdomains, tokens, {save: ['test-user-1', 'test-user-0']}).then(results => {
      assert.deepEqual(results.subdomain1.emojiList, specHelper.testEmojiList(10));
      assert.deepEqual(results.subdomain2.emojiList, specHelper.testEmojiList(10));

      assert.equal(results.subdomain1.saveResults.length, 10);
      assert.equal(results.subdomain2.saveResults.length, 10);
    });
  });
});
