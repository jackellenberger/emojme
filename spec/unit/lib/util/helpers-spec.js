const chai = require('chai');

const assert = chai.assert;
const commander = require('commander');
const Helpers = require('../../../../lib/util/helpers');
const Cli = require('../../../../lib/util/cli');

describe('Helpers', () => {
  describe('zipAuthTuples', () => {
    it('zips together equal length subdomain and token lists', () => {
      const subdomains = ['subdomain 1'];
      const tokens = ['token 1'];
      const cookies = ['cookie 1'];
      const options = {};

      const [authTuples, srcPairs, dstPairs] = Helpers.zipAuthTuples(
        subdomains,
        tokens,
        cookies,
        options,
      );

      assert.deepEqual(authTuples, [['subdomain 1', 'token 1', 'cookie 1']]);
      assert.deepEqual(srcPairs, []);
      assert.deepEqual(dstPairs, []);
    });

    it('zips src and dst auth pairs when given', () => {
      const subdomains = ['subdomain 1'];
      const tokens = ['token 1'];
      const cookies = ['cookie 1'];
      const options = {
        srcSubdomains: ['src subdomain 1', 'src subdomain 2'],
        srcTokens: ['src token 1', 'src token 2'],
        srcCookies: ['src cookie 1', 'src cookie 2'],
        dstSubdomains: ['dst subdomain 1'],
        dstTokens: ['dst token 1'],
        dstCookies: ['dst cookie 1'],
      };

      const [authTuples, srcPairs, dstPairs] = Helpers.zipAuthTuples(
        subdomains,
        tokens,
        cookies,
        options,
      );

      const expectedSrcPairs = [['src subdomain 1', 'src token 1', 'src cookie 1'], ['src subdomain 2', 'src token 2', 'src cookie 2']];
      const expectedDstPairs = [['dst subdomain 1', 'dst token 1', 'dst cookie 1']];

      assert.deepEqual(authTuples, [['subdomain 1', 'token 1', 'cookie 1']].concat(expectedSrcPairs, expectedDstPairs));
      assert.deepEqual(srcPairs, expectedSrcPairs);
      assert.deepEqual(dstPairs, expectedDstPairs);
    });

    it('throws an error when auth pairs are mismatched', () => {
      const subdomains = ['subdomain 1'];
      const tokens = [];
      const options = {};

      assert.throws(
        (() => { Helpers.zipAuthTuples(subdomains, tokens, options); }),
        Error, /Invalid input/,
      );
    });

    it('throws an error when src/dst auth pairs are mismatched', () => {
      const subdomains = ['subdomain 1'];
      const tokens = [];
      const options = {
        srcSubdomains: ['src subdomain 1', 'src subdomain 2'],
        srcTokens: [],
        dstSubdomains: ['dst subdomain 1'],
        dstTokens: ['dst token 1'],
      };

      assert.throws(
        (() => { Helpers.zipAuthTuples(subdomains, tokens, options); }),
        Error, /Invalid input/,
      );
    });
  });

  describe('avoidCollisions', () => {
    it('does not add id when adding unique emoji, even when emoji name slug space overlaps', () => {
      const existingEmojiList = [
        { name: 'emoji1' },
      ];

      const newEmojiList = [
        { name: 'emoji' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result,
        [{ name: 'emoji' }]);
    });

    it('adds id when a direct emoji collision is detected', () => {
      const existingEmojiList = [
        { name: 'emoji' },
      ];

      const newEmojiList = [
        { name: 'emoji' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result,
        [{ name: 'emoji-1', collision: 'emoji' }]);
    });

    it('adapts to new emoji name delimiter when one is present', () => {
      const existingEmojiList = [];

      const newEmojiList = [
        { name: 'e_m_o_j_i' }, { name: 'e_m_o_j_i' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result, [
        { name: 'e_m_o_j_i' },
        { name: 'e_m_o_j_i_1', collision: 'e_m_o_j_i' },
      ]);
    });

    it('adapts to uploaded emoji name delimiter when one is present', () => {
      const existingEmojiList = [
        { name: 'emoji1' },
      ];

      const newEmojiList = [
        { name: 'emoji1' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result,
        [{ name: 'emoji2', collision: 'emoji1' }]);
    });

    it('adds id to all but first emoji when multiple identical emoji names are added', () => {
      const existingEmojiList = [];

      const newEmojiList = [
        { name: 'emoji' },
        { name: 'emoji' },
        { name: 'emoji' },
        { name: 'emoji' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result, [
        { name: 'emoji' },
        { name: 'emoji-1', collision: 'emoji' },
        { name: 'emoji-2', collision: 'emoji' },
        { name: 'emoji-3', collision: 'emoji' },
      ]);
    });

    it('gracefully folds in existing id\'d emoji', () => {
      const existingEmojiList = [{ name: 'emoji-2' }];

      const newEmojiList = [
        { name: 'emoji' },
        { name: 'emoji' },
        { name: 'emoji' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result, [
        { name: 'emoji' },
        { name: 'emoji-1', collision: 'emoji' },
        { name: 'emoji-3', collision: 'emoji' },
      ]);
    });

    it('does not clobber id\'d new emoji names', () => {
      const existingEmojiList = [{ name: 'emoji-1' }];

      const newEmojiList = [
        { name: 'emoji-1' },
        { name: 'emoji-2' },
        { name: 'emoji-3' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result, [
        {
          collision: 'emoji-1',
          name: 'emoji-4',
        },
        { name: 'emoji-2' },
        { name: 'emoji-3' },
      ]);
    });


    it('gracefully folds in id\'d new emoji', () => {
      const existingEmojiList = [];

      const newEmojiList = [
        { name: 'emoji' },
        { name: 'emoji-2' },
        { name: 'emoji' },
        { name: 'emoji' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result, [
        { name: 'emoji' },
        { name: 'emoji-2' },
        { name: 'emoji-1', collision: 'emoji' },
        { name: 'emoji-3', collision: 'emoji' },
      ]);
    });


    it('does not increment numberal emoji names', () => {
      const existingEmojiList = [
        { name: '1984' },
      ];

      const newEmojiList = [
        { name: '1984' }, { name: '1984' },
      ];

      const result = Helpers.avoidCollisions(newEmojiList, existingEmojiList);
      assert.deepEqual(result, [
        { name: '1984-1', collision: '1984' },
        { name: '1984-2', collision: '1984' },
      ]);
    });
  });

  describe('formatResultHash', () => {
    it('organizes promise array output into more easily indexable hash', () => {
      const promiseArrayResult = [
        {
          subdomain: 'subdomain1',
          result1: 'first part of results',
          result2: ['second', 'part', 'of', 'results'],
          result3: {
            third: 'part',
            of: 'results',
          },
        },
        {
          subdomain: 'subdomain2',
          result4: 'first part of results',
          result5: ['second', 'part', 'of', 'results'],
          result6: {
            third: 'part',
            of: 'results',
          },
        },
      ];
      assert.deepEqual(Helpers.formatResultsHash(promiseArrayResult), {
        subdomain1: {
          result1: 'first part of results',
          result2: ['second', 'part', 'of', 'results'],
          result3: {
            third: 'part',
            of: 'results',
          },
        },
        subdomain2: {
          result4: 'first part of results',
          result5: ['second', 'part', 'of', 'results'],
          result6: {
            third: 'part',
            of: 'results',
          },
        },
      });
    });
  });
});
