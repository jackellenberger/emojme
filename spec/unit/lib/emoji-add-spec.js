var chai = require('chai');

describe('EmojiAdd', () => {
  describe('getData', () => {
    it('downloads links', done => {
      done();
    });

    it('passes through existing data', done => {
      done();
    });

    it('reads in file paths', done => {
      done();
    });

    it('rejects with error if no data is gettable', done => {
      done();
    });
  });

  describe('createMultipart', () => {
    it('creates an alias multipart request', done => {
      done();
    });

    it('creates a multipart emoji request', done => {
      done();
    });
  });

  describe('uploadSingle', () => {
    context('on successful slack request', () => {
      it('handles error responses', done => {
        done();
      });

      it('handles success responses', done => {
        done();
      });
    });

    context('on unsuccessful slack request', () => {
      it('catches error', done => {
        done();
      });
    });
  });

  describe('upload', () => {
    it('handles source file inputs', done => {
      done();
    });

    it('handles array inputs', done => {
      done();
    });

    it('uploads new emoji first, then aliases', done => {
      done();
    });

    it('gathers unsuccessful results', done => {
      done();
    });
  });
});
