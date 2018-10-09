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
beforeEach(() => {
  debugger;
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  debugger;
  sandbox.restore();
});

describe('download', () => {
  let subdomains = ['subdomain2', 'subdomain2'];
  let tokens = ['token1', 'token2'];

  beforeEach(() => {
    getStub = sandbox.stub(EmojiAdminList.prototype, 'get');
    getStub.resolves(
      specHelper.testEmojiList(10)
    );
  });

  it('downloads emojiList when save is not set', () => {
    return download(subdomains, tokens).then(results => {
      assert.deepEqual(results.subdomain1, {});
      assert.deepEqual(results.subdomain2, {});
    });
  });

  it('downloads emoji for specified users when save is set', () => {
    return download(subdomains, tokens, {save: ['user-1', 'user-0']}).then(results => {
      assert.deepEqual(results.subdomain1, {});
      assert.deepEqual(results.subdomain2, {});
    });
  });
});
