const assert = require('chai').assert;
const sinon = require('sinon');
const _ = require('lodash');
let fs = require('graceful-fs');

let EmojiAdminList = require('../../../lib/emoji-admin-list');
let SlackClient = require('../../../lib/slack-client');
let FileUtils = require('../../../lib/file-utils');

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
    it('creates multipart request for specified page', () => {
      for (pageNum in [0, 1, 10]) {
        let part = adminList.createMultipart(pageNum);

        assert.deepEqual(part, {
          query: '',
          page: pageNum,
          count: adminList.pageSize,
          token: specHelper.authPair[1]
        });
      }
    });
  });

  describe('get', () => {
    let testEmojiList = specHelper.testEmojiList(3);

    it('uses cached json file if it is not expired', done => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ctimeMs: Date.now()});
      sandbox.stub(FileUtils, 'readJson').withArgs(sinon.match.any).returns(testEmojiList);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('ignores cached json file if it is expired', done => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ctimeMs: 0});
      sandbox.stub(FileUtils, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then(emojiList => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('generates new emojilist if no cache file exists', done => {
      sandbox.stub(FileUtils, 'isExpired').withArgs(sinon.match.any).returns(true);
      sandbox.stub(FileUtils, 'writeJson').withArgs(sinon.match.any);

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

    it('returns null if user is not a contributor', () => {
      result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', 'a non existent user');

      assert.deepEqual(result, []);
    });

    it('returns a user\'s emoji contributions', () => {
      result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', 'test-user-0');

      assert.equal(result.length, 1);
      assert.equal(result[0].user, 'test-user-0');
    });

    it('returns multiple users\' contributions if provided', () => {
      result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', ['test-user-0', 'test-user-1']);

      assert.equal(result.length, 2);
      assert.equal(result[0].user, 'test-user-0');
      assert.equal(result[1].user, 'test-user-1');
    });

    it('returns existent users and filters out non existent users', () => {
      result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', ['test-user-0', 'non existent user', 'test-user-1']);

      assert.equal(result.length, 2);
      assert.equal(result[0].user, 'test-user-0');
      assert.equal(result[1].user, 'test-user-1');
    });
  });

  describe('summarizeSubdomain', () => {
    let emojiList = specHelper.testEmojiList(11);

    it('returns sorted list of contributors', () => {
      let result = EmojiAdminList.summarizeSubdomain(emojiList, 'subdomain', 10);

      assert.isAbove(result[0].count, result[1].count);
    });

    it('returns all contributors if count > number of contributors', () => {
      let result = EmojiAdminList.summarizeSubdomain(emojiList, 'subdomain', 10);

      assert.equal(result.length, _.uniqBy(emojiList, 'user_display_name').length);
    });

    it('returns n contributors when n is provided', () => {
      let n = 1;
      let result = EmojiAdminList.summarizeSubdomain(emojiList, 'subdomain', n);

      assert.equal(result.length, n);
    });
  });

  describe('diff', () => {
    context('when explicit source and destination are given', () => {
      it('creates upload diffs for every subdomain given', () => {
        let srcLists = [specHelper.testEmojiList(10)];
        let srcSubdomains = ['src 1'];
        let dstLists = [specHelper.testEmojiList(5), specHelper.testEmojiList(10)];
        let dstSubdomains = ['dst 1', 'dst 2'];

        let [diffTo1, diffTo2] = EmojiAdminList.diff(srcLists, srcSubdomains, dstLists, dstSubdomains);
        assert.equal(diffTo1.subdomain, 'dst 1');
        assert.equal(diffTo1.emojiList.length, 5);

        assert.equal(diffTo2.subdomain, 'dst 2');
        assert.equal(diffTo2.emojiList.length, 0);
      });

      it('diffs contain emoji from all other subdomains', () => {
        let srcLists = [specHelper.testEmojiList(10), specHelper.testEmojiList(20)];
        let srcSubdomains = ['src 1', 'src 2'];
        let dstLists = [specHelper.testEmojiList(1)];
        let dstSubdomains = ['dst 1'];

        let [diffTo1] = EmojiAdminList.diff(srcLists, srcSubdomains, dstLists, dstSubdomains);

        assert.equal(diffTo1.subdomain, 'dst 1');
        assert.equal(diffTo1.emojiList.length, 19);
      });
    });

    context('when destination is not given', () => {
      it('makes the given subdomains and emoji both the src and dst', () => {
        let lists = [specHelper.testEmojiList(5), specHelper.testEmojiList(10)];
        let subdomains = ['sub 1', 'sub 2'];

        let [diffTo1, diffTo2] = EmojiAdminList.diff(lists, subdomains);
        assert.equal(diffTo1.subdomain, 'sub 1');
        assert.equal(diffTo1.emojiList.length, 5);

        assert.equal(diffTo2.subdomain, 'sub 2');
        assert.equal(diffTo2.emojiList.length, 0);
      });

      it('creates upload diffs for every given subdomain', () => {
        let lists = [specHelper.testEmojiList(5), specHelper.testEmojiList(10), specHelper.testEmojiList(20)];
        let subdomains = ['sub 1', 'sub 2', 'sub 3'];

        let [diffTo1, diffTo2, diffTo3] = EmojiAdminList.diff(lists, subdomains);

        assert.equal(diffTo1.subdomain, 'sub 1');
        assert.equal(diffTo1.emojiList.length, 15);

        assert.equal(diffTo2.subdomain, 'sub 2');
        assert.equal(diffTo2.emojiList.length, 10);

        assert.equal(diffTo3.subdomain, 'sub 3');
        assert.equal(diffTo3.emojiList.length, 0);
      });
    });

    it('creates accurate diffs', () => {
      let subdomains = ['sub 1', 'sub 2', 'sub 3'];
      let lists = [
        [
          { name: 'present-in-all' },
          { name: 'present-in-1-and-2' }
        ],
        [
          { name: 'present-in-all' },
          { name: 'present-in-1-and-2' },
          { name: 'present-in-2-and-3' }
        ],
        [
          { name: 'present-in-all' },
          { name: 'present-in-2-and-3' },
          { name: 'present-in-3' }
        ]
      ];

      let [diffTo1, diffTo2, diffTo3] = EmojiAdminList.diff(lists, subdomains);

      assert.equal(diffTo1.subdomain, 'sub 1');
      assert.deepEqual(diffTo1.emojiList, [
        {name: 'present-in-2-and-3'},
        {name: 'present-in-3'}
      ]);

      assert.equal(diffTo2.subdomain, 'sub 2');
      assert.deepEqual(diffTo2.emojiList, [
        {name: 'present-in-3'}
      ]);

      assert.equal(diffTo3.subdomain, 'sub 3');
      assert.deepEqual(diffTo3.emojiList, [
        {name: 'present-in-1-and-2'}
      ]);
    });
  });
});
