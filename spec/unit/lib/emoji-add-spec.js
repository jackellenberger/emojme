const assert = require('chai').assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

const EmojiAdd = require('../../../lib/emoji-add');
const SlackClient = require('../../../lib/slack-client');
const logger = require('../../../lib/logger');

const specHelper = require('../../spec-helper');

let sandbox, emojiAdd, warningSpy, infoSpy, debugSpy;

beforeEach(() => {
  sandbox = sinon.createSandbox();
  emojiAdd = new EmojiAdd('subdomain', 'token');

  warningSpy = sandbox.spy(logger, 'warning');
  infoSpy = sandbox.spy(logger, 'info');
  debugSpy = sandbox.spy(logger, 'debug');
});

afterEach(() => {
  sandbox.restore();
});

describe('EmojiAdd', () => {
  describe('createMultipart', () => {
    it('creates an alias multipart request', () => {
      const emoji = {
        name: 'name',
        is_alias: 1,
        alias_for: 'some other emoji',
      };

      return EmojiAdd.createMultipart(emoji, 'token').then((result) => {
        assert.deepEqual(result, {
          token: 'token',
          name: emoji.name,
          mode: 'alias',
          alias_for: emoji.alias_for,
        });
      });
    });

    it('creates a multipart emoji request', () => {
      const emoji = {
        name: 'name',
        url: './spec/fixtures/Example.jpg',
      };

      return EmojiAdd.createMultipart(emoji, 'token').then((result) => {
        assert.deepEqual(result, {
          token: 'token',
          name: emoji.name,
          mode: 'data',
          image: fs.readFileSync(emoji.url),
        });
      });
    });
  });

  describe('uploadSingle', () => {
    const emoji = {
      name: 'name',
      url: './spec/fixtures/Example.jpg',
    };

    it('adds error responses to result', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: false, error: 'sample error' },
      );

      return emojiAdd.uploadSingle(emoji).then((result) => {
        assert.deepEqual(result,
          Object.assign({}, emoji, { error: 'sample error' }));
      });
    });

    it('does not return anything for successful responses', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: true },
      );

      return emojiAdd.uploadSingle(emoji).then((result) => {
        assert.equal(result, false);
      });
    });
  });

  describe('upload', () => {
    it('handles source file inputs', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(),
      );

      return emojiAdd.upload('./spec/fixtures/emojiList.json').then((results) => {
        assert.deepEqual(results.errorList, []);
      });
    });

    it('handles array inputs', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(),
      );

      return emojiAdd.upload(specHelper.testEmojiList(2)).then((results) => {
        assert.deepEqual(results.errorList, []);
      });
    });

    it('uploads new emoji first, then aliases', () => {
      sandbox.spy(emojiAdd, 'uploadSingle');

      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(),
      );

      return emojiAdd.upload('./spec/fixtures/emojiList.json').then((results) => {
        assert.deepEqual(results.errorList, []);

        const calls = emojiAdd.uploadSingle.getCalls();
        assert.equal(calls[0].args[0].name, 'emoji-1');
        assert.equal(calls[1].args[0].name, 'emoji-3');
        assert.equal(calls[2].args[0].name, 'emoji-2');
        assert.equal(calls[3].args[0].name, 'emoji-4');
      });
    });

    it('gathers unsuccessful results', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        { ok: false, error: 'sample error' },
      );

      return emojiAdd.upload(specHelper.testEmojiList(2)).then((results) => {
        for (const result in results.errors) {
          assert.equal(result.error, 'sample error');
        }
      });
    });

    it('gathers successful results', () => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(),
      );

      return emojiAdd.upload('./spec/fixtures/emojiList.json').then((results) => {
        let infoCalls = infoSpy.getCalls();

        assert.deepEqual(results.errorList, []);
        assert.equal(infoSpy.callCount, 2);
        assert.match(infoCalls[1].lastArg, /.*total requests: 4[\s\S]*successes: 4[\s\S]*errors: 0.*/);
      });
    });
  });
});
