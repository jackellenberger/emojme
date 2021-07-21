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
    }).timeout(10000);

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

  describe('sanitize', () => {
    it('removes emoji', (done) => {
      const input = 'frog emoji 🐸is best';
      const expectedOutput = 'frog emoji is best';
      assert.equal(FileUtils.sanitize(input), expectedOutput);
      done();
    });

    it('replaces non alphanumeric chars', (done) => {
      const input = 'abc 123 ,/^ =+% \\|?';
      const expectedOutput = 'abc 123';
      assert.equal(FileUtils.sanitize(input), expectedOutput);
      done();
    });

    it('retains dashes and underscores', (done) => {
      const input = 'Jack_Skellenberger (2016-2020)';
      const expectedOutput = 'Jack_Skellenberger 2016-2020';
      assert.equal(FileUtils.sanitize(input), expectedOutput);
      done();
    });
  });
});
