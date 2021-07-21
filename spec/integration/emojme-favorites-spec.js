const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));

const assert = chai.assert;
const sinon = require('sinon');
const _ = require('lodash');

const specHelper = require('../spec-helper');
const ClientBoot = require('../../lib/client-boot');
const EmojiAdminList = require('../../lib/emoji-admin-list');
const FileUtils = require('../../lib/util/file-utils');

const favorites = require('../../emojme-favorites').favorites;
const favoritesCli = require('../../emojme-favorites').favoritesCli;

let sandbox;
beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('favorites', () => {
  beforeEach(() => {
    const clientBootGetStub = sandbox.stub(ClientBoot.prototype, 'get');
    clientBootGetStub.resolves(
      specHelper.mockedBootData(),
    );

    const emojiAdminListGetStub = sandbox.stub(EmojiAdminList.prototype, 'get');
    emojiAdminListGetStub.resolves(
      specHelper.testEmojiList(10),
    );

    // prevent writing during tests
    sandbox.stub(FileUtils, 'saveData').callsFake((arg1, arg2) => Promise.resolve(arg2));
    sandbox.stub(FileUtils, 'writeJson');
  });

  describe('returns favoritesResultObject', () => {
    const validateResults = ((result) => {
      let usage1 = 10;
      let usage2 = 10;
      assert.shallowDeepEqual(result, {
        subdomain1: {
          favoritesResult: {
            user: 'username',
            subdomain: 'subdomain1',
            favoriteEmoji: specHelper.testEmojiList(10).map(e => e.name),
            favoriteEmojiAdminList: _.reduce(specHelper.testEmojiList(10), (acc, e) => {
              acc.push({ [e.name]: { ...e, usage: usage1-- } });
              return acc;
            }, []),
          },
        },
        subdomain2: {
          favoritesResult: {
            user: 'username',
            subdomain: 'subdomain2',
            favoriteEmoji: specHelper.testEmojiList(10).map(e => e.name),
            favoriteEmojiAdminList: _.reduce(specHelper.testEmojiList(10), (acc, e) => {
              acc.push({ [e.name]: { ...e, usage: usage2-- } });
              return acc;
            }, []),
          },
        },
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'favorites',
        '--subdomain', 'subdomain1',
        '--subdomain', 'subdomain2',
        '--token', 'token1',
        '--token', 'token2',
        '--cookie', 'cookie1',
        '--cookie', 'cookie2',
      ];
      return favoritesCli().then(validateResults);
    });

    it('using the module', () => favorites(['subdomain1', 'subdomain1', 'subdomain2'],
      ['token1', 'token2', 'token3'],
      ['cookie1', 'cookie2', 'cookie3'],
      {}).then(validateResults));
  });
});
