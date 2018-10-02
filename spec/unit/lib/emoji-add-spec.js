var chai = require('chai');

let EmojiAdd = require('../../../lib/emoji-add');

describe('EmojiAdd', () => {
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
