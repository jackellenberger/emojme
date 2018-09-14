var chai = require('chai');

describe('EmojiAdminList', () => {
  describe('createMultipart', () => {
    it('creates multipart request for specified page', done => {
    });
  });

  describe('get', () => {
    it('uses cached json file if it is not expired', done => {
    });

    it('ignores cached json file if it is expired', done => {
    });

    it('generates new emojilist if no cache file exists', done => {
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

    context('when only source is given', () => {
      it('makes the given subdomains and emoji both the src and dst', done => {
      });

      it('creates upload diffs for every given subdomain', done => {
      });
    });

    it('creates accurate diffs', done => {
    });
  });
});
