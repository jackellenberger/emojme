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

describe.only('add', () => {
  describe('avoidCollisions', () => {
    beforeEach(function () {
      let uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
      uploadStub.callsFake(arg1 => Promise.resolve({emojiList: arg1}));
    });

    it('does not add id when adding unique emoji, even when emoji name slug space overlaps', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{ name: 'emoji1' }]
      );

      let options = {
        name: ['emoji'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        assert.equal(result[0].emojiList[0].name, 'emoji');
      });
    });

    it('adds id when a direct emoji collision is detected', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{ name: 'emoji' }]
      );

      let options = {
        name: ['emoji'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        assert.equal(result[0].emojiList[0].name, 'emoji-1');
      });
    });

    it('adapts to new emoji name delimiter when one is present', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves([]);

      let options = {
        name: ['e_m_o_j_i', 'e_m_o_j_i'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        assert.equal(result[0].emojiList[0].name, 'e_m_o_j_i');
        assert.equal(result[0].emojiList[1].name, 'e_m_o_j_i_1');
      });
    });//TODO

    it('adapts to uploaded emoji name delimiter when one is present', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{name: 'emoji1'}]
      );

      let options = {
        name: ['emoji1'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        assert.equal(result[0].emojiList[0].name, 'emoji2');
      });
    });

    it('adds id to all but first emoji when multiple identical emoji names are added', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves([]);

      let options = {
        name: ['emoji', 'emoji', 'emoji', 'emoji'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        assert.equal(result[0].emojiList[0].name, 'emoji');
        assert.equal(result[0].emojiList[1].name, 'emoji-1');
        assert.equal(result[0].emojiList[2].name, 'emoji-2');
        assert.equal(result[0].emojiList[3].name, 'emoji-3');
      });
    });

    it('gracefully folds in existing id\'d emoji', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{name: 'emoji-2'}]
      );

      let options = {
        name: ['emoji', 'emoji', 'emoji'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        debugger;
        assert.equal(result[0].emojiList[0].name, 'emoji');
        assert.equal(result[0].emojiList[1].name, 'emoji-1');
        assert.equal(result[0].emojiList[2].name, 'emoji-3');
      });
    });

    it('gracefully folds in id\'d new emoji', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves([]);

      let options = {
        name: ['emoji', 'emoji-2', 'emoji', 'emoji'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        debugger;
        assert.equal(result[0].emojiList[0].name, 'emoji');
        assert.equal(result[0].emojiList[1].name, 'emoji-2');
        assert.equal(result[0].emojiList[2].name, 'emoji-1');
        assert.equal(result[0].emojiList[3].name, 'emoji-3');
      });
    });


    it('does not increment numberal emoji names', () => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{name: '1984'}]
      );

      let options = {
        name: ['1984', '1984'],
        aliasFor: [],
        avoidCollisions: true
      };

      return add('subdomain', 'token', options).then(result => {
        assert.equal(result[0].emojiList[0].name, '1984-1');
        assert.equal(result[0].emojiList[1].name, '1984-2');
      });
    });
  });
});
