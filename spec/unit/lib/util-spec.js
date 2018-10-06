const assert = require('chai').assert;
let Util = require('../../../lib/util');

describe('Util', () => {
  describe('zipAuthPairs', () => {
    it('zips together equal length subdomain and token lists', () => {
      let subdomains = ['subdomain 1'];
      let tokens = ['token 1'];
      let options = {};

      let [authPairs, srcPairs, dstPairs] = Util.zipAuthPairs(subdomains, tokens, options);

      assert.deepEqual(authPairs, [['subdomain 1', 'token 1']]);
      assert.deepEqual(srcPairs, []);
      assert.deepEqual(dstPairs, []);
    });

    it('zips src and dst auth pairs when given', () => {
      let subdomains = ['subdomain 1'];
      let tokens = ['token 1'];
      let options = {
        srcSubdomains: ['src subdomain 1', 'src subdomain 2'],
        srcTokens: ['src token 1', 'src token 2'],
        dstSubdomains: ['dst subdomain 1'],
        dstTokens: ['dst token 1']
      };

      let [authPairs, srcPairs, dstPairs] = Util.zipAuthPairs(subdomains, tokens, options);

      let expectedSrcPairs = [['src subdomain 1', 'src token 1'], ['src subdomain 2', 'src token 2']];
      let expectedDstPairs = [['dst subdomain 1', 'dst token 1']];

      assert.deepEqual(authPairs, [['subdomain 1', 'token 1']].concat(expectedSrcPairs, expectedDstPairs));
      assert.deepEqual(srcPairs, expectedSrcPairs);
      assert.deepEqual(dstPairs, expectedDstPairs);
    });

    it('throws an error when auth pairs are mismatched', () => {
      let subdomains = ['subdomain 1'];
      let tokens = [];
      let options = {};

      assert.throws(
        (() => { Util.zipAuthPairs(subdomains, tokens, options)}),
        Error, /Invalid input/
      );
    });

    it('throws an error when src/dst auth pairs are mismatched', () => {
      let subdomains = ['subdomain 1'];
      let tokens = [];
      let options = {
        srcSubdomains: ['src subdomain 1', 'src subdomain 2'],
        srcTokens: [],
        dstSubdomains: ['dst subdomain 1'],
        dstTokens: ['dst token 1']
      };

      assert.throws(
        (() => { Util.zipAuthPairs(subdomains, tokens, options)}),
        Error, /Invalid input/
      );
    });
  });

  describe('avoidCollisions', () => {
    it('does not add id when adding unique emoji, even when emoji name slug space overlaps', () => {
      let existingEmojiList = [
        { name: 'emoji1' }
      ];

      let newEmojiList = [
        {name: 'emoji'},
      ];

      debugger;
      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
      assert.equal(result[0].name, 'emoji');
    });

    it('adds id when a direct emoji collision is detected', () => {
      let existingEmojiList = [
        { name: 'emoji' }
      ];

      let newEmojiList = [
        {name: 'emoji'},
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
        assert.equal(result[0].name, 'emoji-1');
    });

    it('adapts to new emoji name delimiter when one is present', () => {
      let existingEmojiList = [];

      let newEmojiList = [
        {name: 'e_m_o_j_i'}, {name: 'e_m_o_j_i'}
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
        assert.equal(result[0].name, 'e_m_o_j_i');
        assert.equal(result[1].name, 'e_m_o_j_i_1');
    });

    it('adapts to uploaded emoji name delimiter when one is present', () => {
      let existingEmojiList = [
        {name: 'emoji1'}
      ];

      let newEmojiList = [
        {name: 'emoji1'}
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
      assert.equal(result[0].name, 'emoji2');
    });

    it('adds id to all but first emoji when multiple identical emoji names are added', () => {
      let existingEmojiList = [];

      let newEmojiList = [
        {name: 'emoji'},
        {name: 'emoji'},
        {name: 'emoji'},
        {name: 'emoji'}
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
      assert.equal(result[0].name, 'emoji');
      assert.equal(result[1].name, 'emoji-1');
      assert.equal(result[2].name, 'emoji-2');
      assert.equal(result[3].name, 'emoji-3');
    });

    it('gracefully folds in existing id\'d emoji', () => {
      let existingEmojiList = [{name: 'emoji-2'}];

      let newEmojiList = [
        {name: 'emoji'},
        {name: 'emoji'},
        {name: 'emoji'}
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
      assert.equal(result[0].name, 'emoji');
      assert.equal(result[1].name, 'emoji-1');
      assert.equal(result[2].name, 'emoji-3');
    });

    it('gracefully folds in id\'d new emoji', () => {
      let existingEmojiList = [];

      let newEmojiList = [
        {name: 'emoji'},
        {name: 'emoji-2'},
        {name: 'emoji'},
        {name: 'emoji'},
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
      assert.equal(result[0].name, 'emoji');
      assert.equal(result[1].name, 'emoji-2');
      assert.equal(result[2].name, 'emoji-1');
      assert.equal(result[3].name, 'emoji-3');
    });


    it('does not increment numberal emoji names', () => {
      let existingEmojiList = [
        {name: '1984'}
      ];

      let newEmojiList = [
        {name: '1984'}, {name: '1984'}
      ];

      let result = Util.avoidCollisions(newEmojiList, existingEmojiList);
      assert.equal(result[0].name, '1984-1');
      assert.equal(result[1].name, '1984-2');
    });
  });
});
