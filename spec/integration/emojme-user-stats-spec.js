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

beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('user-stats', () => {
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
});
