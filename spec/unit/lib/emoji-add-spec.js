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
    it('creates an alias multipart request', done => {
      let emoji = {
        name: 'name',
        is_alias: 1,
        alias_for: 'some other emoji'
      };

      EmojiAdd.createMultipart(emoji, 'token').then(result => {
        assert.deepEqual(result, {
          token: 'token',
          name: emoji.name,
          mode: 'alias',
          alias_for: emoji.alias_for
        });
        done();
      });
    });

    it('creates a multipart emoji request', done => {
      let emoji = {
        name: 'name',
        url: './spec/fixtures/Example.jpg'
      };

      EmojiAdd.createMultipart(emoji, 'token').then(result => {
        assert.deepEqual(result, {
          token: 'token',
          name: emoji.name,
          mode: 'data',
          image: fs.readFileSync(emoji.url)
        });
        done();
      });
    });
  });

  describe('uploadSingle', () => {
    let emoji = {
      name: 'name',
      url: './spec/fixtures/Example.jpg'
    };

    it('adds error responses to result', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: false, error: 'there was a problem' }
      );

      emojiAdd.uploadSingle(emoji).then(result => {
        assert.deepEqual(result,
          Object.assign({}, emoji, {error: 'there was a problem'})
        );
        done();
      });
    });

    it('does not return anything for successful responses', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: true }
      );

      emojiAdd.uploadSingle(emoji).then(result => {
        assert.equal(result, null);
        done();
      });
    });
  });

  describe('upload', () => {
    it('handles source file inputs', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse()
      );

      emojiAdd.upload('./spec/fixtures/emojiList.json').then(results => {
        assert.deepEqual(results.errorsList, []);
        done();
      });
    });

    it('handles array inputs', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse()
      );

      emojiAdd.upload(specHelper.testEmojiList(2)).then(results => {
        assert.deepEqual(results.errorsList, []);
        done();
      });
    });

    it('uploads new emoji first, then aliases', done => {
      sandbox.spy(emojiAdd, 'uploadSingle');

      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse()
      );

      emojiAdd.upload('./spec/fixtures/emojiList.json').then(results => {
        assert.deepEqual(results.errorsList, []);

        let calls = emojiAdd.uploadSingle.getCalls();
        assert.equal(calls[0].args[0].name, 'emoji 1');
        assert.equal(calls[1].args[0].name, 'emoji 3');
        assert.equal(calls[2].args[0].name, 'emoji 2');
        assert.equal(calls[3].args[0].name, 'emoji 4');
        done();
      });
    });

    it('gathers unsuccessful results', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: false, error: 'there was a problem' }
      );

      emojiAdd.upload(specHelper.testEmojiList(2)).then(results => {
        for (result in results.errors) {
          assert.equal(result.error, 'there was a problem');
        }
        done();
      });
    });
  });
});
