const assert = require('chai').assert;
const sinon = require('sinon');
const _ = require('lodash');
const fs = require('graceful-fs');

const EmojiAdminList = require('../../../lib/emoji-admin-list');
const SlackClient = require('../../../lib/slack-client');
const FileUtils = require('../../../lib/util/file-utils');

const specHelper = require('../../spec-helper');

let sandbox;
let adminList;
beforeEach(() => {
  sandbox = sinon.createSandbox();
  adminList = new EmojiAdminList(...specHelper.authTuple);
});

afterEach(() => {
  sandbox.restore();
});

describe('EmojiAdminList', () => {
  describe('createMultipart', () => {
    it('creates multipart request for specified page', () => {
      let pageNum;

      for (pageNum in [0, 1, 10]) {
        const part = adminList.createMultipart(pageNum);

        assert.deepEqual(part, {
          query: '',
          page: pageNum,
          count: adminList.pageSize,
          token: specHelper.authTuple[1],
        });
      }
    });
  });

  describe('get', () => {
    const testEmojiList = specHelper.testEmojiList(3);

    it('uses cached json file if it is not expired', (done) => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ ctimeMs: Date.now() });
      sandbox.stub(FileUtils, 'readJson').withArgs(sinon.match.any).returns(testEmojiList);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then((emojiList) => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('ignores cached json file if it is expired', (done) => {
      sandbox.stub(fs, 'existsSync').withArgs(sinon.match.any).returns(true);
      sandbox.stub(fs, 'statSync').withArgs(sinon.match.any).returns({ ctimeMs: 0 });
      sandbox.stub(FileUtils, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then((emojiList) => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });

    it('generates new emojilist if no cache file exists', (done) => {
      sandbox.stub(FileUtils, 'isExpired').withArgs(sinon.match.any).returns(true);
      sandbox.stub(FileUtils, 'writeJson').withArgs(sinon.match.any);

      sandbox.stub(EmojiAdminList.prototype, 'getAdminListPages').resolves(testEmojiList);

      adminList.get().then((emojiList) => {
        assert.deepEqual(emojiList, testEmojiList);
        done();
      });
    });
  });

  describe('getAdminListPages', () => {
    it('pulls initial page with total number of pages', (done) => {
      sandbox.stub(SlackClient.prototype, 'request').withArgs(sinon.match.any).resolves(
        specHelper.mockedSlackResponse(1, 1, 1, true),
      );

      adminList.getAdminListPages().then((emojiLists) => {
        assert.deepEqual(emojiLists[0], specHelper.testEmojiList(1));
        assert.equal(emojiLists.length, 1);
        done();
      });
    });

    it('generates as many requests as pages', (done) => {
      const req = sandbox.stub(SlackClient.prototype, 'request');
      for (let i = 0; i <= 10; i++) {
        req.onCall(i).resolves(
          specHelper.mockedSlackResponse(10, 1, i + 1, true),
        );
      }

      adminList.setPageSize(1);
      adminList.getAdminListPages().then((emojiLists) => {
        assert.equal(emojiLists.length, 10);
        done();
      });
    });

    it('rejects when requests return errors in body', (done) => {
      const req = sandbox.stub(SlackClient.prototype, 'request');
      req.onCall(0).resolves(specHelper.mockedSlackResponse(2, 1, 1, true));
      req.onCall(1).resolves(specHelper.mockedSlackResponse(2, 1, 2, false));

      adminList.setPageSize(1);
      adminList.getAdminListPages().then((emojiLists) => {
        assert.equal(emojiLists.length, 1);
        done();
      });
    });
  });

  describe('summarizeUser', () => {
    const emojiList = specHelper.testEmojiList(10);

    it('returns null if user is not a contributor', () => {
      const result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', 'a non existent user');

      assert.deepEqual(result, []);
    });

    it('returns a user\'s emoji contributions', () => {
      const result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', 'test-user-0');

      assert.equal(result.length, 1);
      assert.equal(result[0].user, 'test-user-0');
    });

    it('returns multiple users\' contributions if provided', () => {
      const result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', ['test-user-0', 'test-user-1']);

      assert.equal(result.length, 2);
      assert.equal(result[0].user, 'test-user-0');
      assert.equal(result[1].user, 'test-user-1');
    });

    it('returns existent users and filters out non existent users', () => {
      const result = EmojiAdminList.summarizeUser(emojiList, 'subdomain', ['test-user-0', 'non existent user', 'test-user-1']);

      assert.equal(result.length, 2);
      assert.equal(result[0].user, 'test-user-0');
      assert.equal(result[1].user, 'test-user-1');
    });
  });

  describe('summarizeSubdomain', () => {
    const emojiList = specHelper.testEmojiList(11);

    it('returns sorted list of contributors', () => {
      const result = EmojiAdminList.summarizeSubdomain(emojiList, 'subdomain', 10);

      assert.isAbove(result[0].totalCount, result[1].totalCount);
    });

    it('returns all contributors if count > number of contributors', () => {
      const result = EmojiAdminList.summarizeSubdomain(emojiList, 'subdomain', 10);

      assert.equal(result.length, _.uniqBy(emojiList, 'user_display_name').length);
    });

    it('returns n contributors when n is provided', () => {
      const n = 1;
      const result = EmojiAdminList.summarizeSubdomain(emojiList, 'subdomain', n);

      assert.equal(result.length, n);
    });
  });

  describe('since', () => {
    const emojiList = specHelper.testEmojiList(10);

    context('when given a time in the future', () => {
      it('returns an empty array', () => {
        const result = EmojiAdminList.since(emojiList, Date.now() + 86400);

        assert.deepEqual(result, []);
      });
    });

    context('when given a time older than any emoji', () => {
      it('returns the passed in emojiList', () => {
        const result = EmojiAdminList.since(emojiList, -1);

        assert.deepEqual(result, emojiList);
      });
    });

    context('when given a time bisecting emoji creation dates', () => {
      it('returns the part of the emojiList that was created after the given time', () => {
        const result = EmojiAdminList.since(emojiList, 86400 * 5);

        assert.equal(result.length, 4);
        result.forEach((emoji) => {
          assert.equal(emoji.created > 86400 * 5, true);
        });
      });
    });
  });

  describe('diff', () => {
    context('when explicit source and destination are given', () => {
      it('creates upload diffs for every subdomain given', () => {
        const srcLists = [specHelper.testEmojiList(10)];
        const srcSubdomains = ['src 1'];
        const dstLists = [specHelper.testEmojiList(5), specHelper.testEmojiList(10)];
        const dstSubdomains = ['dst 1', 'dst 2'];

        const [diffTo1, diffTo2] = EmojiAdminList.diff(
          srcLists, srcSubdomains, dstLists, dstSubdomains,
        );
        assert.equal(diffTo1.dstSubdomain, 'dst 1');
        assert.equal(diffTo1.emojiList.length, 5);

        assert.equal(diffTo2.dstSubdomain, 'dst 2');
        assert.equal(diffTo2.emojiList.length, 0);
      });

      it('diffs contain emoji from all other subdomains', () => {
        const srcLists = [specHelper.testEmojiList(10), specHelper.testEmojiList(20)];
        const srcSubdomains = ['src 1', 'src 2'];
        const dstLists = [specHelper.testEmojiList(1)];
        const dstSubdomains = ['dst 1'];

        const [diffTo1] = EmojiAdminList.diff(srcLists, srcSubdomains, dstLists, dstSubdomains);

        assert.equal(diffTo1.dstSubdomain, 'dst 1');
        assert.equal(diffTo1.emojiList.length, 19);
      });
    });

    context('when destination is not given', () => {
      it('makes the given subdomains and emoji both the src and dst', () => {
        const lists = [specHelper.testEmojiList(5), specHelper.testEmojiList(10)];
        const subdomains = ['sub 1', 'sub 2'];

        const [diffTo1, diffTo2] = EmojiAdminList.diff(lists, subdomains);
        assert.equal(diffTo1.dstSubdomain, 'sub 1');
        assert.equal(diffTo1.emojiList.length, 5);

        assert.equal(diffTo2.dstSubdomain, 'sub 2');
        assert.equal(diffTo2.emojiList.length, 0);
      });

      it('creates upload diffs for every given subdomain', () => {
        const lists = [
          specHelper.testEmojiList(5),
          specHelper.testEmojiList(10),
          specHelper.testEmojiList(20),
        ];
        const subdomains = ['sub 1', 'sub 2', 'sub 3'];

        const [diffTo1, diffTo2, diffTo3] = EmojiAdminList.diff(lists, subdomains);

        assert.equal(diffTo1.dstSubdomain, 'sub 1');
        assert.equal(diffTo1.emojiList.length, 15);

        assert.equal(diffTo2.dstSubdomain, 'sub 2');
        assert.equal(diffTo2.emojiList.length, 10);

        assert.equal(diffTo3.dstSubdomain, 'sub 3');
        assert.equal(diffTo3.emojiList.length, 0);
      });
    });

    it('creates accurate diffs', () => {
      const subdomains = ['sub 1', 'sub 2', 'sub 3'];
      const lists = [
        [
          { name: 'present-in-all' },
          { name: 'present-in-1-and-2' },
        ],
        [
          { name: 'present-in-all' },
          { name: 'present-in-1-and-2' },
          { name: 'present-in-2-and-3' },
        ],
        [
          { name: 'present-in-all' },
          { name: 'present-in-2-and-3' },
          { name: 'present-in-3' },
        ],
      ];

      const [diffTo1, diffTo2, diffTo3] = EmojiAdminList.diff(lists, subdomains);

      assert.equal(diffTo1.dstSubdomain, 'sub 1');
      assert.deepEqual(diffTo1.emojiList, [
        { name: 'present-in-2-and-3' },
        { name: 'present-in-3' },
      ]);

      assert.equal(diffTo2.dstSubdomain, 'sub 2');
      assert.deepEqual(diffTo2.emojiList, [
        { name: 'present-in-3' },
      ]);

      assert.equal(diffTo3.dstSubdomain, 'sub 3');
      assert.deepEqual(diffTo3.emojiList, [
        { name: 'present-in-1-and-2' },
      ]);
    });
  });
});
