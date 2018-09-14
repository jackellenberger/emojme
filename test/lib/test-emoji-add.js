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
    });

    it('creates a multipart emoji request', done => {
    });
  });

  describe('uploadSingle', () => {
    context('on successful slack request', () => {
      it('handles error responses', done => {
      });

      it('handles success responses', done => {
      });
    });

    context('on unsuccessful slack request', () => {
      it('catches error', done => {

      });
    });
  });

  describe('upload', () => {
    it('handles source file inputs', done => {
    });

    it('handles array inputs', done => {
    });

    it('uploads new emoji first, then aliases', done => {
    });

    it('gathers unsuccessful results', done => {
    });
  });
});
