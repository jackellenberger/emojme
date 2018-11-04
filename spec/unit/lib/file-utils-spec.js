const assert = require('chai').assert;
const fs = require('graceful-fs');

const FileUtils = require('../../../lib/util/file-utils');

describe('FileUtils', () => {
  describe('getData', () => {
    const fileData = fs.readFileSync('./spec/fixtures/Example.jpg');

    it('downloads links', (done) => {
      const path = 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg';
      FileUtils.getData(path).then((urlData) => {
        assert.deepEqual(fileData, urlData);
        done();
      });
    });

    it('passes through existing data', (done) => {
      const path = `data:image/jpeg;${Buffer.from(fileData).toString('base64')}`;
      FileUtils.getData(path).then((urlData) => {
        assert.deepEqual(path, urlData);
        done();
      });
    });

    it('reads in file paths', (done) => {
      const path = './spec/fixtures/Example.jpg';
      FileUtils.getData(path).then((urlData) => {
        assert.deepEqual(fileData, urlData);
        done();
      });
    });

    it('rejects with error if no data is gettable', (done) => {
      const path = 'malformed';
      FileUtils.getData(path).then(() => {
        throw new Error('Should not get here');
      }).catch((err) => {
        assert.isDefined(err);
        done();
      });
    });
  });
});
