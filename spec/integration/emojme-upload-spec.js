const chai = require('chai');
const assert = chai.assert;

const sinon = require('sinon');
const fs = require('graceful-fs');

let EmojiAdd = require('../../lib/emoji-add');
let EmojiAdminList = require('../../lib/emoji-admin-list');
let SlackClient = require('../../lib/slack-client');
let upload = require('../../emojme-upload').upload;

let sandbox;
let uploadStub;

beforeEach(function () {
  sandbox = sinon.createSandbox();
});

afterEach(function () {
  sandbox.restore();
});

describe('upload', () => {
  beforeEach(function () {
    uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
    uploadStub.callsFake(arg1 => Promise.resolve({subdomain: 'subdomain', emojiList: arg1}));

    sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
      [{ name: 'emoji-1' }]
    );
  });

  it('uploads emoji from specified json', () => {
    let options = { src: './spec/fixtures/emojiList.json' };
    let fixture = JSON.parse(fs.readFileSync('./spec/fixtures/emojiList.json', 'utf-8'));

    return upload('subdomain', 'token', options).then(results => {
      assert.deepEqual(results, { subdomain:
        {
          collisions: [
            fixture[0]
          ],
          emojiList: [
            fixture[1],
            fixture[2],
            fixture[3],
          ]
        }
      });

      assert.deepEqual(uploadStub.getCall(0).args, [
        [
          fixture[1],
          fixture[2],
          fixture[3],
        ]
      ]);
    });
  });

  it('renames emoji to avoid collisions when avoidCollisions is set', () => {
    let options = {
      src: './spec/fixtures/emojiList.json',
      avoidCollisions: true
    };
    let fixture = JSON.parse(fs.readFileSync('./spec/fixtures/emojiList.json', 'utf-8'));

    return upload('subdomain', 'token', options).then(results => {
      assert.deepEqual(results, { subdomain:
        {
          collisions: [],
          emojiList: [
            {...fixture[0], name: 'emoji-5', collision: 'emoji-1'},
            fixture[1],
            fixture[2],
            fixture[3],
          ]
        }
      });
    });
  });

  it('collects and does not attempt to upload collisions when avoidCollisions is false', () => {
    let options = {
      src: './spec/fixtures/emojiList.json'
    };
    let fixture = JSON.parse(fs.readFileSync('./spec/fixtures/emojiList.json', 'utf-8'));

    return upload('subdomain', 'token', options).then(results => {
      assert.deepEqual(results, {subdomain:
        {
          collisions: [
            fixture[0]
          ],
          emojiList: [
            fixture[1],
            fixture[2],
            fixture[3],
          ]
        }
      });
    });
  });
});
