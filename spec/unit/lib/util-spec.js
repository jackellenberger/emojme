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

});
