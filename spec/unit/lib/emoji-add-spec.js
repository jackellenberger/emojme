const assert = require('chai').assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

let EmojiAdd = require('../../../lib/emoji-add');
let SlackClient = require('../../../lib/slack-client');

let specHelper = require('../../spec-helper');
let sandbox;
let emojiAdd;
beforeEach(function () {
  sandbox = sinon.createSandbox();
  emojiAdd = new EmojiAdd('subdomain', 'token');
});

afterEach(function () {
  sandbox.restore();
});

describe('EmojiAdd', () => {
  describe('createMultipart', () => {
    it('creates an alias multipart request', () => {
      let emoji = {
        name: 'name',
        is_alias: 1,
        alias_for: 'some other emoji'
      };

      return EmojiAdd.createMultipart(emoji, 'token').then(result => {
        assert.deepEqual(result, {
          token: 'token',
          name: emoji.name,
          mode: 'alias',
          alias_for: emoji.alias_for
        });
      });
    });

    it('creates a multipart emoji request', () => {
      let emoji = {
        name: 'name',
        url: './spec/fixtures/Example.jpg'
      };

      return EmojiAdd.createMultipart(emoji, 'token').then(result => {
        assert.deepEqual(result, {
          token: 'token',
          name: emoji.name,
          mode: 'data',
          image: fs.readFileSync(emoji.url)
        });
      });
    });
  });

  describe('uploadSingle', () => {
    let emoji = {
      name: 'name',
      url: './spec/fixtures/Example.jpg'
    };

    it('adds error responses to result', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: false, error: 'there was a problem' }
      );

      return emojiAdd.uploadSingle(emoji).then(result => {
        assert.deepEqual(result,
          Object.assign({}, emoji, {error: 'there was a problem'})
        );
      });
    });

    it('does not return anything for successful responses', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: true }
      );

      return emojiAdd.uploadSingle(emoji).then(result => {
        assert.equal(result, false);
      });
    });
  });

  describe('upload', () => {
    it('handles source file inputs', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse()
      );

      return emojiAdd.upload('./spec/fixtures/emojiList.json').then(results => {
        assert.deepEqual(results.errorList, []);
      });
    });

    it('handles array inputs', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse()
      );

      return emojiAdd.upload(specHelper.testEmojiList(2)).then(results => {
        assert.deepEqual(results.errorList, []);
      });
    });

    it('uploads new emoji first, then aliases', () => {
      sandbox.spy(emojiAdd, 'uploadSingle');

      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse()
      );

      return emojiAdd.upload('./spec/fixtures/emojiList.json').then(results => {
        assert.deepEqual(results.errorList, []);

        let calls = emojiAdd.uploadSingle.getCalls();
        assert.equal(calls[0].args[0].name, 'emoji-1');
        assert.equal(calls[1].args[0].name, 'emoji-3');
        assert.equal(calls[2].args[0].name, 'emoji-2');
        assert.equal(calls[3].args[0].name, 'emoji-4');
      });
    });

    it('gathers unsuccessful results', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: false, error: 'there was a problem' }
      );

      return emojiAdd.upload(specHelper.testEmojiList(2)).then(results => {
        for (result in results.errors) {
          assert.equal(result.error, 'there was a problem');
        }
      });
    });
  });
});
