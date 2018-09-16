const assert = require('chai').assert;
const sinon = require('sinon');

let EmojiAdminList = require('../../../lib/emoji-admin-list');
let SlackClient = require('../../../lib/slack-client');
let FileUtils = require('../../../lib/file-utils');
let fs = require('fs');

let specHelper = require('../../spec-helper');

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
      let adminList = new EmojiAdminList(...specHelper.authPair);

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

      let adminList = new EmojiAdminList(...specHelper.authPair);
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

      let adminList = new EmojiAdminList(...specHelper.authPair);
      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('generates new emojilist if no cache file exists', done => {
      sandbox.stub(FileUtils.prototype, 'isExpired').withArgs(sinon.match.any).returns(true);
      sandbox.stub(FileUtils.prototype, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      let adminList = new EmojiAdminList(...specHelper.authPair);
      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });
  });

  describe.only('getAdminListPages', () => {
    it('pulls initial page with total number of pages', done => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(1,1,1,true)
      );

      let adminList = new EmojiAdminList(...specHelper.authPair);
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

      let adminList = new EmojiAdminList(...specHelper.authPair);
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

      let adminList = new EmojiAdminList(...specHelper.authPair);
      adminList.setPageSize(1);
      adminList.getAdminListPages().then(emojiLists => {
        assert.equal(emojiLists.length, 1);
        done();
      });
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
