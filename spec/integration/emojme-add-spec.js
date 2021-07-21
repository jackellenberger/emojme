const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));

const assert = chai.assert;
const sinon = require('sinon');

const EmojiAdd = require('../../lib/emoji-add');
const EmojiAdminList = require('../../lib/emoji-admin-list');
const SlackClient = require('../../lib/slack-client');
const FileUtils = require('../../lib/util/file-utils');
const add = require('../../emojme-add').add;
const addCli = require('../../emojme-add').addCli;

const logger = require('../../lib/logger');

let sandbox;
let warningSpy; let infoSpy; let
  debugSpy;

beforeEach(() => {
  sandbox = sinon.createSandbox();
  warningSpy = sandbox.spy(logger, 'warning');
  infoSpy = sandbox.spy(logger, 'info');
  debugSpy = sandbox.spy(logger, 'debug');
});

afterEach(() => {
  sandbox.restore();
  logger.transports[0].level = 'warning';
});

describe('add', () => {
  context('pre upload configuration', () => {
    beforeEach(() => {
      const uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
      uploadStub.callsFake(arg1 => Promise.resolve({ subdomain: 'subdomain', emojiList: arg1 }));

      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{ name: 'emoji-1' }],
      );
    });

    describe('renames emoji to avoid collisions when avoidCollisions is set', () => {
      const validateResults = ((results) => {
        assert.shallowDeepEqual(results, {
          subdomain:
          {
            collisions: [],
            emojiList: [
              {
                name: 'emoji-5',
                collision: 'emoji-1',
              },
              { name: 'emoji-2' },
              { name: 'emoji-3' },
              { name: 'emoji-4' },
            ],
          },
        });
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain',
          '--token', 'token',
          '--cookie', 'cookie',
          '--name', 'emoji-1', '--alias-for', 'emoji',
          '--name', 'emoji-2', '--alias-for', 'emoji',
          '--name', 'emoji-3', '--alias-for', 'emoji',
          '--name', 'emoji-4', '--alias-for', 'emoji',
          '--avoid-collisions',
        ];

        return addCli().then(validateResults);
      });

      it('using the module', () => {
        const options = {
          name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
          aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
          avoidCollisions: true,
        };

        return add('subdomain', 'token', 'cookie', options).then(validateResults);
      });
    });

    describe('allows slack to return exceptions when allowCollisions is set', () => {
      beforeEach(() => {
        sandbox.restore();
        sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
          {
            error: 'error_name_taken',
            alias_for: 'emoji',
            is_alias: 1,
            name: 'emoji-1',
          },
        );
      });

      const validateResults = ((results) => {
        assert.shallowDeepEqual(results, {
          subdomain:
          {
            collisions: [],
            emojiList: [{
              alias_for: 'emoji',
              is_alias: 1,
              name: 'emoji-1',
            }, {
              alias_for: 'emoji',
              is_alias: 1,
              name: 'emoji-2',
            }, {
              alias_for: 'emoji',
              is_alias: 1,
              name: 'emoji-3',
            }, {
              alias_for: 'emoji',
              is_alias: 1,
              name: 'emoji-4',
            },
            ],
            errorList: [
              {
                error: 'error_name_taken',
                alias_for: 'emoji',
                is_alias: 1,
                name: 'emoji-1',
              }, {
                error: 'error_name_taken',
                alias_for: 'emoji',
                is_alias: 1,
                name: 'emoji-2',
              }, {
                error: 'error_name_taken',
                alias_for: 'emoji',
                is_alias: 1,
                name: 'emoji-3',
              }, {
                error: 'error_name_taken',
                alias_for: 'emoji',
                is_alias: 1,
                name: 'emoji-4',
              },
            ],
          },
        });
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain',
          '--token', 'token',
          '--cookie', 'cookie',
          '--name', 'emoji-1', '--alias-for', 'emoji',
          '--name', 'emoji-2', '--alias-for', 'emoji',
          '--name', 'emoji-3', '--alias-for', 'emoji',
          '--name', 'emoji-4', '--alias-for', 'emoji',
          '--allow-collisions',
        ];

        return addCli().then(validateResults);
      });

      it('using the module', () => {
        const options = {
          name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
          aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
          allowCollisions: true,
        };

        return add('subdomain', 'token', 'cookie', options).then(validateResults);
      });
    });

    describe('collects and does not attempt to upload collisions when avoidCollisions is false', () => {
      const validateResults = ((results) => {
        assert.shallowDeepEqual(results, {
          subdomain: {
            collisions: [
              { name: 'emoji-1' },
            ],
            emojiList: [
              { name: 'emoji-2' },
              { name: 'emoji-3' },
              { name: 'emoji-4' },
            ],
          },
        });
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain',
          '--token', 'token',
          '--cookie', 'cookie',
          '--name', 'emoji-1', '--alias-for', 'emoji',
          '--name', 'emoji-2', '--alias-for', 'emoji',
          '--name', 'emoji-3', '--alias-for', 'emoji',
          '--name', 'emoji-4', '--alias-for', 'emoji',
        ];

        return addCli().then(validateResults);
      });

      it('using the module', () => {
        const options = {
          name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
          aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
          avoidCollisions: false,
        };

        return add('subdomain', 'token', 'cookie', options).then(validateResults);
      });
    });
  });

  context('upload behavior', () => {
    beforeEach(() => {
      sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
        [{ name: 'emoji-1' }],
      );
    });

    describe('returns array of subdomain specific results when uploading aliases', () => {
      beforeEach(() => {
        const requestStub = sandbox.stub(SlackClient.prototype, 'request');
        requestStub.withArgs(sinon.match.any).resolves(
          { ok: true },
        );
        requestStub.withArgs(sinon.match.any).onFirstCall().resolves(
          { ok: false, error: 'an error message' },
        );
      });

      const validateResults = ((results) => {
        assert.equal(warningSpy.callCount, 1);
        assert.equal(infoSpy.callCount, 4);
        assert.equal(debugSpy.callCount, 5);

        assert.equal(results.subdomain1.emojiList.length, 3); // 4 minus 1 collision
        assert.deepEqual(results.subdomain1.errorList, [{
          name: 'emoji-2',
          is_alias: 1,
          alias_for: 'emoji',
          error: 'an error message',
        }]); // error on first call

        assert.equal(results.subdomain1.collisions.length, 1); // collision with emoji-1

        assert.equal(results.subdomain2.emojiList.length, 3); // 4 minus 1 collision
        assert.equal(results.subdomain2.errorList.length, 0); // no errors
        assert.equal(results.subdomain2.collisions.length, 1); // collision with emoji-1
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain1',
          '--subdomain', 'subdomain2',
          '--token', 'token1',
          '--token', 'token2',
          '--cookie', 'cookie1',
          '--cookie', 'cookie2',
          '--name', 'emoji-1', '--alias-for', 'emoji',
          '--name', 'emoji-2', '--alias-for', 'emoji',
          '--name', 'emoji-3', '--alias-for', 'emoji',
          '--name', 'emoji-4', '--alias-for', 'emoji',
          '--verbose',
        ];

        return addCli().then(validateResults);
      });

      it('using the module', () => {
        const subdomains = ['subdomain1', 'subdomain2'];
        const tokens = ['token1', 'token2'];
        const cookies = ['cookie1', 'cookie2'];
        const options = {
          name: ['emoji-1', 'emoji-2', 'emoji-3', 'emoji-4'],
          aliasFor: ['emoji', 'emoji', 'emoji', 'emoji'],
          avoidCollisions: false,
        };

        return add(subdomains, tokens, cookies, options).then(validateResults);
      });
    });

    describe('returns array of subdomain specific results when uploading new emoji', () => {
      beforeEach(() => {
        sandbox.stub(FileUtils, 'getData').withArgs(sinon.match.any).resolves('emoji data');

        const requestStub = sandbox.stub(SlackClient.prototype, 'request');
        requestStub.withArgs(sinon.match.any).resolves(
          { ok: true },
        );
        requestStub.withArgs(sinon.match.any).onFirstCall().resolves(
          { ok: false, error: 'an error message' },
        );
      });

      const validateResults = ((results) => {
        assert.equal(results.subdomain1.emojiList.length, 3); // 4 minus 1 collision
        assert.deepEqual(results.subdomain1.errorList, [{
          name: 'emoji-2',
          url: 'emoji-2.jpg',
          is_alias: 0,
          error: 'an error message',
        }]); // error on first call

        assert.equal(results.subdomain1.collisions.length, 1); // collision with emoji-1

        assert.equal(results.subdomain2.emojiList.length, 3); // 4 minus 1 collision
        assert.equal(results.subdomain2.errorList.length, 0); // no errors
        assert.equal(results.subdomain2.collisions.length, 1); // collision with emoji-1
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain1',
          '--subdomain', 'subdomain2',
          '--token', 'token1',
          '--token', 'token2',
          '--cookie', 'cookie1',
          '--cookie', 'cookie2',
          '--src', 'emoji-1.jpg',
          '--src', 'emoji-2.jpg',
          '--src', 'emoji-3.jpg',
          '--src', 'emoji-4.jpg',
        ];

        return addCli().then(validateResults);
      });

      it('using the module', () => {
        const subdomains = ['subdomain1', 'subdomain2'];
        const tokens = ['token1', 'token2'];
        const cookies = ['cookie1', 'cookie2'];
        const options = {
          src: ['emoji-1.jpg', 'emoji-2.jpg', 'emoji-3.jpg', 'emoji-4.jpg'],
          avoidCollisions: false,
        };

        return add(subdomains, tokens, cookies, options).then(validateResults);
      });
    });

    describe('allows mixed new / alias inputs when correctly formatted', () => {
      beforeEach(() => {
        sandbox.stub(EmojiAdd.prototype, 'upload').callsFake(arg1 => Promise.resolve({ subdomain: 'subdomain', emojiList: arg1 }));
      });

      const validateResults = ((results) => {
        assert.deepEqual(results, {
          subdomain: {
            collisions: [],
            emojiList: [
              {
                name: 'new-emoji-1',
                url: 'new-emoji-1.jpg',
                is_alias: 0,
              }, {
                name: 'alias-name-2',
                alias_for: 'alias-src-2',
                is_alias: 1,
              }, {
                name: 'alias-name-3',
                alias_for: 'alias-src-3',
                is_alias: 1,
              }, {
                name: 'emoji-name-4',
                url: 'new-emoji-4.gif',
                is_alias: 0,
              },
            ],
          },
        });
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain',
          '--token', 'token',
          '--cookie', 'cookie',
          '--src', 'new-emoji-1.jpg', '--name', '',
          '--src', '', '--name', 'alias-name-2', '--alias-for', 'alias-src-2',
          '--src', '', '--name', 'alias-name-3', '--alias-for', 'alias-src-3',
          '--src', 'new-emoji-4.gif', '--name', 'emoji-name-4',
        ];

        return addCli().then(validateResults);
      });

      it('using the module', () => {
        const options = {
          src: ['new-emoji-1.jpg', null, null, 'new-emoji-4.gif'],
          name: [null, 'alias-name-2', 'alias-name-3', 'emoji-name-4'],
          aliasFor: ['alias-src-2', 'alias-src-3'],
        };

        return add('subdomain', 'tokens', 'cookies', options).then(validateResults);
      });
    });

    describe('rejects poorly formatted inputs', () => {
      const validateError = ((err) => {
        assert.equal(err.message, 'Invalid input. Either not all inputs have been consumed, or not all emoji are well formed. Consider simplifying input, or padding input with `null` values.');
      });

      it('using the cli', () => {
        process.argv = [
          'node',
          'emojme',
          'add',
          '--subdomain', 'subdomain',
          '--token', 'token',
          '--cookie', 'cookie',
          '--src', 'emoji-1.jpg', '--name', 'emoji-1',
          '--name', 'emoji-2', '--alias-for', 'emoji-2-original',
          '--alias-for', 'unattached-alias',
        ];

        return addCli().then(() => assert.fail()).catch(validateError); // eslint-disable-line no-undef
      });

      it('using the module', () => {
        const options = {
          src: ['emoji-1.jpg'],
          name: ['emoji-1', 'emoji-2'],
          aliasFor: ['emoji-2-original', 'unattached-alias'],
        };

        return add('subdomain', 'tokens', 'cookies', options)
          .then(() => assert.fail()).catch(validateError); // eslint-disable-line no-undef
      });
    });
  });
});
