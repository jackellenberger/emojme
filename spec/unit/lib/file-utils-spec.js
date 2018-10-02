const assert = require('chai').assert;
let fs = require('graceful-fs');

let FileUtils = require('../../../lib/file-utils');

describe.only('FileUtils', () => {
  describe('getData', () => {
    let fileData = fs.readFileSync('./spec/fixtures/Example.jpg');

    it('downloads links', done => {
      let path = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';
      FileUtils.getData(path).then(urlData => {
        assert.deepEqual(fileData, urlData);
        done();
      });
    });

    it('passes through existing data', done => {
      let path = `data:image/jpeg;${Buffer.from(fileData).toString('base64')}`;
      FileUtils.getData(path).then(urlData => {
        assert.deepEqual(path, urlData);
        done();
      });
    });

    it('reads in file paths', done => {
      let path = './spec/fixtures/Example.jpg';
      FileUtils.getData(path).then(urlData => {
        assert.deepEqual(fileData, urlData);
        done();
      });
    });

    it('rejects with error if no data is gettable', done => {
      let path = 'malformed';
      FileUtils.getData(path).then(() => {
        throw new Error('Should not get here');
      }).catch(err => {
        assert.isDefined(err);
        done();
      });
    });
  });
});
