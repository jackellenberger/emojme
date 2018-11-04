const chai = require('chai');

const assert = chai.assert;

const sinon = require('sinon');
const fs = require('graceful-fs');

const EmojiAdd = require('../../lib/emoji-add');
const EmojiAdminList = require('../../lib/emoji-admin-list');
const FileUtils = require('../../lib/util/file-utils');
const upload = require('../../emojme-upload').upload;
const uploadCli = require('../../emojme-upload').uploadCli;

let sandbox;
let uploadStub;

beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('upload', () => {
  beforeEach(() => {
    uploadStub = sandbox.stub(EmojiAdd.prototype, 'upload');
    uploadStub.callsFake(arg1 => Promise.resolve({ subdomain: 'subdomain', emojiList: arg1 }));

    sandbox.stub(EmojiAdminList.prototype, 'get').withArgs(sinon.match.any).resolves(
      [{ name: 'emoji-1' }],
    );
  });

  describe('uploads emoji from specified json', () => {
    const validateResults = ((results) => {
      const fixture = JSON.parse(fs.readFileSync('./spec/fixtures/emojiList.json', 'utf-8'));

      assert.deepEqual(results, {
        subdomain:
        {
          collisions: [
            fixture[0],
          ],
          emojiList: [
            fixture[1],
            fixture[2],
            fixture[3],
          ],
        },
      });

      assert.deepEqual(uploadStub.getCall(0).args, [
        [
          fixture[1],
          fixture[2],
          fixture[3],
        ],
      ]);
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'upload',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--src', './spec/fixtures/emojiList.json',
      ];
      return uploadCli().then(validateResults);
    });

    it('using the module', () => {
      const options = { src: './spec/fixtures/emojiList.json' };

      return upload('subdomain', 'token', options).then(validateResults);
    });
  });

  describe('uploads emoji from specified yaml', () => {
    const validateResults = ((results) => {
      const fixture = FileUtils.readYaml('./spec/fixtures/emojiList.yaml', 'utf-8');
      assert.deepEqual(results, {
        subdomain:
        {
          collisions: [
            fixture[0],
          ],
          emojiList: [
            fixture[1],
            fixture[2],
            fixture[3],
          ],
        },
      });

      assert.deepEqual(uploadStub.getCall(0).args, [
        [
          fixture[1],
          fixture[2],
          fixture[3],
        ],
      ]);
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'upload',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--src', './spec/fixtures/emojiList.yaml',
      ];
      return uploadCli().then(validateResults);
    });

    it('using the module', () => {
      const options = { src: './spec/fixtures/emojiList.yaml' };

      return upload('subdomain', 'token', options).then(validateResults);
    });
  });

  describe('renames emoji to avoid collisions when avoidCollisions is set', () => {
    const validateResults = ((results) => {
      const fixture = JSON.parse(fs.readFileSync('./spec/fixtures/emojiList.json', 'utf-8'));
      assert.deepEqual(results, {
        subdomain:
        {
          collisions: [],
          emojiList: [
            { ...fixture[0], name: 'emoji-5', collision: 'emoji-1' },
            fixture[1],
            fixture[2],
            fixture[3],
          ],
        },
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'upload',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--src', './spec/fixtures/emojiList.json',
        '--avoid-collisions',
      ];
      return uploadCli().then(validateResults);
    });

    it('using the module', () => {
      const options = {
        src: './spec/fixtures/emojiList.json',
        avoidCollisions: true,
      };

      return upload('subdomain', 'token', options).then(validateResults);
    });
  });

  describe('collects and does not attempt to upload collisions when avoidCollisions is false', () => {
    const validateResults = ((results) => {
      const fixture = JSON.parse(fs.readFileSync('./spec/fixtures/emojiList.json', 'utf-8'));
      assert.deepEqual(results, {
        subdomain:
        {
          collisions: [
            fixture[0],
          ],
          emojiList: [
            fixture[1],
            fixture[2],
            fixture[3],
          ],
        },
      });
    });

    it('using the cli', () => {
      process.argv = [
        'node',
        'emojme',
        'upload',
        '--subdomain', 'subdomain',
        '--token', 'token',
        '--src', './spec/fixtures/emojiList.json',
      ];
      return uploadCli().then(validateResults);
    });

    it('using the module', () => {
      const options = {
        src: './spec/fixtures/emojiList.json',
      };

      return upload('subdomain', 'token', options).then(validateResults);
    });
  });
});
