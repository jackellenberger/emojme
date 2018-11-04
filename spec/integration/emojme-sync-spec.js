const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const assert = chai.assert;
const sinon = require('sinon');
const fs = require('graceful-fs');

let EmojiAdd = require('../../lib/emoji-add');
let EmojiAdminList = require('../../lib/emoji-admin-list');
let SlackClient = require('../../lib/slack-client');
let FileUtils = require('../../lib/util/file-utils');
let Helpers = require('../../lib/util/helpers');

let specHelper = require('../spec-helper');
let sync = require('../../emojme-sync').sync;
let syncCli = require('../../emojme-sync').syncCli;

let sandbox;
beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('sync', () => {
  beforeEach(() => {
    uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
    uploadStub.callsFake(arg1 => {
      let subdomain = uploadStub.thisValues[uploadStub.callCount - 1].subdomain;
      return Promise.resolve({subdomain: subdomain, emojiList: arg1})
    });

    // Each subdomain will have 2 unique emoji and 2 emoji shared
    // between them.
    let getStub = sandbox.stub(EmojiAdminList.prototype, 'get');
    getStub.callsFake(() => {
      let subdomain = (getStub.thisValues[getStub.callCount - 1].subdomain);
      let uniqEmoji = Helpers.applyPrefix(specHelper.testEmojiList(2), `${subdomain}-`);
      let sharedEmoji = specHelper.testEmojiList(2);

      return uniqEmoji.concat(sharedEmoji);
    });

    // prevent writing during tests
    sandbox.stub(FileUtils, 'saveData').callsFake((arg1, arg2) => Promise.resolve(arg2));
    sandbox.stub(FileUtils, 'mkdirp');
  });

  describe('syncs one directionally when src and dst auth pairs are specified', () => {
    let validateResults = (results => {
      assert.shallowDeepEqual(results, {
        dstSubdomain: {
          emojiList: [
            { name: 'srcSubdomain-emoji-0' },
            { name: 'srcSubdomain-emoji-1' }
          ]
        }
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'sync',
        '--src-subdomain', 'srcSubdomain',
        '--src-token', 'srcToken',
        '--dst-subdomain', 'dstSubdomain',
        '--dst-token', 'dstToken',
      ];
      return syncCli().then(validateResults);
    });

    it('using the module', () => {
      return sync([], [], {
        srcSubdomains: ['srcSubdomain'],
        srcTokens: ['srcToken'],
        dstSubdomains: ['dstSubdomain'],
        dstTokens: ['dstToken']
      }).then(validateResults);
    });
  });

  describe('syncs one directionally from multiple sources to a single destionation when specified', () => {
    let validateResults = (results => {
      assert.shallowDeepEqual(results, {
        dstSubdomain: {
          emojiList: [
            { name: 'srcSubdomain-1-emoji-0' },
            { name: 'srcSubdomain-1-emoji-1' },
            { name: 'srcSubdomain-2-emoji-0' },
            { name: 'srcSubdomain-2-emoji-1' },
          ]
        }
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'sync',
        '--src-subdomain', 'srcSubdomain-1',
        '--src-subdomain', 'srcSubdomain-2',
        '--src-token', 'srcToken-1',
        '--src-token', 'srcToken-2',
        '--dst-subdomain', 'dstSubdomain',
        '--dst-token', 'dstToken',
      ];
      return syncCli().then(validateResults);
    });

    it('using the module', () => {
      return sync([], [], {
        srcSubdomains: ['srcSubdomain-1', 'srcSubdomain-2'],
        srcTokens: ['srcToken-1', 'srcToken-2'],
        dstSubdomains: ['dstSubdomain'],
        dstTokens: ['dstToken']
      }).then(validateResults);
    });
  });

  describe('syncs one directionally from multiple sources to a multiple destionations when specified', () => {
    let validateResults = (results => {
      assert.shallowDeepEqual(results, {
        'dstSubdomain-1': {
          emojiList: [
            { name: 'srcSubdomain-1-emoji-0' },
            { name: 'srcSubdomain-1-emoji-1' },
            { name: 'srcSubdomain-2-emoji-0' },
            { name: 'srcSubdomain-2-emoji-1' },
          ]
        },
        'dstSubdomain-2': {
          emojiList: [
            { name: 'srcSubdomain-1-emoji-0' },
            { name: 'srcSubdomain-1-emoji-1' },
            { name: 'srcSubdomain-2-emoji-0' },
            { name: 'srcSubdomain-2-emoji-1' },
          ]
        }
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'sync',
        '--src-subdomain', 'srcSubdomain-1',
        '--src-subdomain', 'srcSubdomain-2',
        '--src-token', 'srcToken-1',
        '--src-token', 'srcToken-2',
        '--dst-subdomain', 'dstSubdomain-1',
        '--dst-subdomain', 'dstSubdomain-2',
        '--dst-token', 'dstToken-1',
        '--dst-token', 'dstToken-2',
      ];
      return syncCli().then(validateResults);
    });

    it('using the module', () => {
      return sync([], [], {
        srcSubdomains: ['srcSubdomain-1', 'srcSubdomain-2'],
        srcTokens: ['srcToken-1', 'srcToken-2'],
        dstSubdomains: ['dstSubdomain-1', 'dstSubdomain-2'],
        dstTokens: ['dstToken-1', 'dstToken-2']
      }).then(validateResults);
    });
  });

  describe('syncs all emoji across all auth pairs when mutliple subdomains and tokens are specified', () => {
    let validateResults = (results => {
      assert.shallowDeepEqual(results, {
        'subdomain-1': {
          emojiList: [
            { name: 'subdomain-2-emoji-0' },
            { name: 'subdomain-2-emoji-1' },
            { name: 'subdomain-3-emoji-0' },
            { name: 'subdomain-3-emoji-1' },
          ]
        },
        'subdomain-2': {
          emojiList: [
            { name: 'subdomain-1-emoji-0' },
            { name: 'subdomain-1-emoji-1' },
            { name: 'subdomain-3-emoji-0' },
            { name: 'subdomain-3-emoji-1' },
          ]
        },
        'subdomain-3': {
          emojiList: [
            { name: 'subdomain-1-emoji-0' },
            { name: 'subdomain-1-emoji-1' },
            { name: 'subdomain-2-emoji-0' },
            { name: 'subdomain-2-emoji-1' },
          ]
        }
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'sync',
        '--subdomain', 'subdomain-1',
        '--subdomain', 'subdomain-2',
        '--subdomain', 'subdomain-3',
        '--token', 'token-1',
        '--token', 'token-2',
        '--token', 'token-3'
      ];
      return syncCli().then(validateResults);
    });

    it('using the module', () => {
      return sync(['subdomain-1', 'subdomain-2', 'subdomain-3'],
                  ['token-1', 'token-2', 'token-3'], {}).then(validateResults);
    });
  });
});
