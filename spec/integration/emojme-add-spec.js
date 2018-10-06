const assert = require('chai').assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

let EmojiAdd = require('../../lib/emoji-add');
let EmojiAdminList = require('../../lib/emoji-admin-list');
let SlackClient = require('../../lib/slack-client');
let add = require('../../emojme-add').add;

let sandbox;
beforeEach(function () {
  sandbox = sinon.createSandbox();
});

afterEach(function () {
  sandbox.restore();
});

//TODO: these are really Util.avoidCollisions tests
describe('add', () => {
  beforeEach(function () {
    let uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
    uploadStub.callsFake(arg1 => Promise.resolve({emojiList: arg1}));

    sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
      [{ name: 'emoji1' }]
    );
  });
});
