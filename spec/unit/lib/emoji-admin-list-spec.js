const assert = require('chai').assert;
const sinon = require('sinon');

let EmojiAdminList = require('../../../lib/emoji-admin-list');
let SlackClient = require('../../../lib/slack-client');
let FileUtils = require('../../../lib/file-utils');
let fs = require('fs');

let specHelper = require('../../spec-helper');

let sandbox;
let adminList;
beforeEach(function () {
  sandbox = sinon.createSandbox();
  adminList = new EmojiAdminList(...specHelper.authPair);
});

afterEach(function () {
  sandbox.restore();
});

describe('EmojiAdminList', () => {
  describe('createMultipart', () => {
    it('creates multipart request for specified page', done => {
      for (pageNum in [0, 1, 10]) {
        let part = adminList.createMultipart(pageNum);

        assert.deepEqual(part, {
          query: '',
          page: pageNum,
          count: adminList.pageSize,
          token: specHelper.authPair[1]
        });
      }

      done();
    });
  });

  describe('get', () => {
    let testEmojiList = specHelper.testEmojiList(3);

    it('uses cached json file if it is not expired', done => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ctimeMs: Date.now()});
      sandbox.stub(FileUtils.prototype, 'readJson').withArgs(sinon.match.any).returns(testEmojiList);

      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('ignores cached json file if it is expired', done => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ctimeMs: 0});
      sandbox.stub(FileUtils.prototype, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('generates new emojilist if no cache file exists', done => {
      sandbox.stub(FileUtils.prototype, 'isExpired').withArgs(sinon.match.any).returns(true);
      sandbox.stub(FileUtils.prototype, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });
  });

  describe('getAdminListPages', () => {
    it('pulls initial page with total number of pages', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(1,1,1,true)
      );

      adminList.getAdminListPages().then(emojiLists => {
        assert.deepEqual(emojiLists[0], specHelper.testEmojiList(1));
        assert.equal(emojiLists.length, 1);
        done();
      });
    });

    it('generates as many requests as pages', done => {
      req = sandbox.stub(SlackClient.prototype, 'request');
      for (let i = 0; i <= 10; i++) {
        req.onCall(i).resolves(
          specHelper.mockedSlackResponse(10, 1, i+1, true)
        );
      }

      adminList.setPageSize(1);
      adminList.getAdminListPages().then(emojiLists => {
        assert.equal(emojiLists.length, 10);
        done();
      });
    });

    it('rejects when requests return errors in body', done => {
      req = sandbox.stub(SlackClient.prototype, 'request');
      req.onCall(0).resolves(specHelper.mockedSlackResponse(2, 1, 1, true));
      req.onCall(1).resolves(specHelper.mockedSlackResponse(2, 1, 2, false));

      adminList.setPageSize(1);
      adminList.getAdminListPages().then(emojiLists => {
        assert.equal(emojiLists.length, 1);
        done();
      });
    });
  });

  describe('summarizeUser', () => {
    let emojiList = specHelper.testEmojiList(10);
    console.log(emojiList);

    it('returns null if user is not a contributor', done => {
      result = EmojiAdminList.summarizeUser(emojiList, 'a non existent user');

      assert.deepEqual(result, []);
      done();
    });

    it('returns a user\'s emoji contributions', done => {
      result = EmojiAdminList.summarizeUser(emojiList, 'test-user-0');

      assert.equal(result.length, 1);
      assert.equal(result[0].user, 'test-user-0');
      done();
    });

    it('returns multiple users\' contributions if provided', done => {
      result = EmojiAdminList.summarizeUser(emojiList, ['test-user-0', 'test-user-1']);

      assert.equal(result.length, 2);
      assert.equal(result[0].user, 'test-user-0');
      assert.equal(result[1].user, 'test-user-1');
      done();
    });

    it('returns existent users and filters out non existent users', done => {
      result = EmojiAdminList.summarizeUser(emojiList, ['test-user-0', 'non existent user', 'test-user-1']);

      assert.equal(result.length, 2);
      assert.equal(result[0].user, 'test-user-0');
      assert.equal(result[1].user, 'test-user-1');
      done();
    });
  });

  describe('summarizeSubdomain', () => {
    it('returns sorted list of contributors', done => {
      done();
    });

    it('returns all contributors if count > number of contributors', done => {
      done();
    });

    it('returns n contributors when n is provided', done => {
      done();
    });
  });

  describe('diff', () => {
    context('when explicit source and destination are given', () => {
      it('creates upload diffs for every subdomain given', done => {
        done();
      });

      it('diffs contain emoji from all other subdomains', done => {
        done();
      });
    });

    context('when destination is not given', () => {
      it('makes the given subdomains and emoji both the src and dst', done => {
        done();
      });

      it('creates upload diffs for every given subdomain', done => {
        done();
      });
    });

    it('creates accurate diffs', done => {
      done();
    });
  });
});
