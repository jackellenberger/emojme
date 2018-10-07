const assert = require('chai').assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

let EmojiAdd = require('../../lib/emoji-add');
let EmojiAdminList = require('../../lib/emoji-admin-list');
let SlackClient = require('../../lib/slack-client');
let FileUtils = require('../../lib/util/file-utils');
let add = require('../../emojme-add').add;

let sandbox;
beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('add', () => {
  context('pre upload configuration', () => {
    beforeEach(() => {
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

  context('upload behavior', () => {
    beforeEach(() => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{name: 'emoji-1'}]
      );
    });

    it('returns array of subdomain specific results when uploading aliases', () => {
      let subdomains = ['subdomain_1', 'subdomain_2'];
      let tokens = ['token_1', 'token_2'];
      let options = {
        name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
        aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
        avoidCollisions: false
      };

      let stub = sandbox.stub(SlackClient.prototype, 'request')
      stub.withArgs(sinon.match.any).resolves(
        { ok: true }
      );
      stub.withArgs(sinon.match.any).onFirstCall().resolves(
        { ok: false, error: 'an error message' }
      );

      return add(subdomains, tokens, options).then(results => {
        assert.equal(results.length, 2);
        assert.equal(results[0].subdomain, 'subdomain_1');
        assert.equal(results[0].emojiList.length, 3); //4 minus 1 collision
        assert.deepEqual(results[0].errorList, [{
          name: 'emoji-2',
          is_alias: 1,
          alias_for: 'emoji',
          error: 'an error message'
        }]); //error on first call

        assert.equal(results[0].collisions.length, 1); //collision with emoji-1

        assert.equal(results[1].subdomain, 'subdomain_2');
        assert.equal(results[1].emojiList.length, 3); //4 minus 1 collision
        assert.equal(results[1].errorList.length, 0); //no errors
        assert.equal(results[1].collisions.length, 1); //collision with emoji-1
      });
    });

    it('returns array of subdomain specific results when uploading new emoji', () => {
      let subdomains = ['subdomain_1', 'subdomain_2'];
      let tokens = ['token_1', 'token_2'];
      let options = {
        src: ['emoji-1.jpg', 'emoji-2.jpg', 'emoji-3.jpg', 'emoji-4.jpg'],
        avoidCollisions: false
      };

      let getDataStub = sandbox.stub(FileUtils, 'getData').withArgs(sinon.match.any).resolves('emoji data');
      let requestStub = sandbox.stub(SlackClient.prototype, 'request')
      requestStub.withArgs(sinon.match.any).resolves(
        { ok: true }
      );
      requestStub.withArgs(sinon.match.any).onFirstCall().resolves(
        { ok: false, error: 'an error message' }
      );

      return add(subdomains, tokens, options).then(results => {
        assert.equal(results.length, 2);
        assert.equal(results[0].subdomain, 'subdomain_1');
        assert.equal(results[0].emojiList.length, 3); //4 minus 1 collision
        assert.deepEqual(results[0].errorList, [{
          name: 'emoji-2',
          url: 'emoji-2.jpg',
          is_alias: 0,
          error: 'an error message'
        }]); //error on first call

        assert.equal(results[0].collisions.length, 1); //collision with emoji-1

        assert.equal(results[1].subdomain, 'subdomain_2');
        assert.equal(results[1].emojiList.length, 3); //4 minus 1 collision
        assert.equal(results[1].errorList.length, 0); //no errors
        assert.equal(results[1].collisions.length, 1); //collision with emoji-1
      });
    });

    it('allows mixed new / alias inputs when correctly formatted', () => {
      let options = {
        src: ['new-emoji-1.jpg', null, null, 'new-emoji-4.gif'],
        name: [null, 'alias-name-2', 'alias-name-3', 'emoji-name-4'],
        aliasFor: ['alias-src-2', 'alias-src-3'],
      };

      let uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
      uploadStub.callsFake(emojiToUpload => {
        assert.deepEqual(emojiToUpload, [
          { is_alias: 0, url: 'new-emoji-1.jpg', name: 'new-emoji-1' },
          { is_alias: 1, alias_for: 'alias-src-2', name: 'alias-name-2' },
          { is_alias: 1, alias_for: 'alias-src-3', name: 'alias-name-3' },
          { is_alias: 0, url: 'new-emoji-4.gif', name: 'emoji-name-4' }
        ]);
        return Promise.resolve({});
      });

      return add('subdomain', 'tokens', options);
    });

    it('rejects poorly formatted inputs', () => {
      let options = {
        src: ['emoji-1.jpg'],
        name: ['emoji-1', 'emoji-2'],
        aliasFor: ['emoji-2-original', 'unattached-alias'],
      };

      return add('subdomain', 'tokens', options)
        .then(() => { fail(); })
        .catch(err => {
          assert.equal(err, 'Invalid input. Either not all inputs have been consumed, or not all emoji are well formed. Consider simplifying input, or padding input with `null` values.');
        });
    });
  });
});
