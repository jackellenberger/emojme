const assert = require('chai').assert;
const sinon = require('sinon');

let EmojiAdminList = require('../../lib/emoji-admin-list');
let FileUtils = require('../../lib/file-utils');
let fs = require('fs');

let testSubdomain = 'subdomain2';
let testSubdomain2 = 'subdomain2';
let testToken = 'token1';
let testToken2 = 'token2';
let testEmojiList = [
  { name: 'emoji 1' },
  { name: 'emoji 2' }
];

let sandbox;
beforeEach(function () {
  sandbox = sinon.createSandbox();
});

afterEach(function () {
  sandbox.restore();
});

describe('EmojiAdminList', () => {
  describe('createMultipart', () => {
    it('creates multipart request for specified page', done => {
      let adminList = new EmojiAdminList(testSubdomain, testToken);

      for (pageNum in [0, 1, 10]) {
        let part = adminList.createMultipart(pageNum);

        assert.deepEqual(part, {
          query: '',
          page: pageNum,
          count: adminList.pageSize,
          token: testToken
        });
      }

      done();
    });
  });

  describe.only('get', () => {
    it('uses cached json file if it is not expired', done => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ctimeMs: Date.now()});
      sandbox.stub(FileUtils.prototype, 'readJson').withArgs(sinon.match.any).returns(testEmojiList);

      let adminList = new EmojiAdminList(testSubdomain, testToken);
      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('ignores cached json file if it is expired', done => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ctimeMs: 0});
      sandbox.stub(FileUtils.prototype, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminList').resolves(testEmojiList);

      let adminList = new EmojiAdminList(testSubdomain, testToken);
      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('generates new emojilist if no cache file exists', done => {
      sandbox.stub(FileUtils.prototype, 'isExpired').withArgs(sinon.match.any).returns(true);
      sandbox.stub(FileUtils.prototype, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminList').resolves(testEmojiList);

      let adminList = new EmojiAdminList(testSubdomain, testToken);
      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });
  });

  describe('getAdminList', () => {
    it('pulls initial page with total number of pages', done => {
    });

    it('generates as many promises as pages', done => {
    });

    it('rejects when requests return errors in body', done => {
    });
  });

  describe('summarizeUser', () => {
    it('returns null if user is not a contributor', done => {
    });

    it('returns a user\'s emoji contributions', done => {
      //TODO: doesn't currently return anything
    });

    it('returns multiple users\' contributions if provided', done => {
    });
  });

  describe('summarizeSubdomain', () => {
    it('returns sorted list of contributors', done => {
    });

    it('returns all contributors if count > number of contributors', done => {
    });

    it('returns n contributors when n is provided', done => {
    });
  });

  describe('summarizeSubdomain', () => {
    context('when explicit source and destination are given', () => {
      it('creates upload diffs for every subdomain given', done => {
      });

      it('diffs contain emoji from all other subdomains', done => {
      });
    });

    context('when destination is not given', () => {
      it('makes the given subdomains and emoji both the src and dst', done => {
      });

      it('creates upload diffs for every given subdomain', done => {
      });
    });

    it('creates accurate diffs', done => {
    });
  });
});
