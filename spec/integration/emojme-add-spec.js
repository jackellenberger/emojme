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

describe('add', () => {
  beforeEach(function () {
    let uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
    uploadStub.callsFake(arg1 => Promise.resolve({emojiList: arg1}));

    sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
      [{ name: 'emoji-1' }]
    );
  });

  it('renames emoji to avoid collisions when avoidCollisions is set', () => {
    let options = {
      name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
      aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
      avoidCollisions: true
    };

    return add('subdomain', 'token', options).then(results => {
      assert.deepEqual(results, [
        {
          collisions: [],
          emojiList: [
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-5",
              "collision": "emoji-1"
            },
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-2"
            },
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-3"
            },
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-4"
            },
          ]
        }
      ]);
    });
  });

  it('collects and does not attempt to upload collisions when avoidCollisions is false', () => {
    let options = {
      name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
      aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
      avoidCollisions: false
    };

    return add('subdomain', 'token', options).then(results => {
      assert.deepEqual(results, [
        {
          collisions: [
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-1",
            },
          ],
          emojiList: [
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-2"
            },
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-3"
            },
            {
              "alias_for": "emoji",
              "is_alias": 1,
              "name": "emoji-4"
            },
          ]
        }
      ]);
    });
  });
});
