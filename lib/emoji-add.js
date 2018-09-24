const fs = require('graceful-fs');
const _ = require('lodash');

const SlackClient = require('./slack-client');
const fileUtils = new(require('./file-utils'));

const ENDPOINT = '/emoji.add';

// Methods to upload emoji to slack.
// Instance methods require slack client.
// Static methods do not.
class EmojiAdd {
  constructor(subdomain, token) {
    this.subdomain = subdomain;
    this.token = token;
    this.slack = new SlackClient(this.subdomain);
    this.endpoint = ENDPOINT;
  }

  uploadSingle(emoji) {
    return this.constructor.createMultipart(emoji, this.token)
      .then(parts => this.slack.request(this.endpoint, parts))
      .then(body => {
        process.stdout.write('.');
        if (!body.ok) {
          console.log(`\nerror on ${emoji.name}: ${body.error}`);
          return Object.assign({}, emoji, { error: body.error });
        }
        return false;
      }).catch(err => { console.log(err) })
  }

  async upload(src) {
    return new Promise((resolve, reject) => {
      let masterList, emojiList, aliasList;

      if (Array.isArray(src)) {
        masterList = src;
      } else if (!fs.existsSync(src)) {
        reject(`Emoji source file ${src} does not exist`);
      } else {
        masterList = fileUtils.readJson(src);
      }
      console.log(`Attempting to upload ${masterList.length} emoji to ${this.subdomain}`);

      [aliasList, emojiList] = _.partition(masterList, 'is_alias');
      return Promise.all(emojiList.map(emoji => this.uploadSingle(emoji)))
      .then(emojiResultArray => {
        return Promise.all(aliasList.map(emoji => this.uploadSingle(emoji)))
          .then(aliasResultArray => emojiResultArray.concat(aliasResultArray))
      }).then(resultArray => {
        let errors = _.filter(resultArray);
        let path = `./build/${this.subdomain}.emojiUploadErrors.json`;
        let errorJson = _.groupBy(errors, 'error');

        let totalCount = resultArray.length;
        let errorsCount = errors.length;
        let successCount = totalCount - errorsCount;
        console.log(`Out of ${totalCount} requests, encountered ${successCount} successes`);
        if (errorsCount > 0) {
          fileUtils.writeJson(path, errorJson);
          console.log(`And ${errorsCount} errors. View them in ${path}`);
        }
        resolve(true);
      });
    });
  }

  static createMultipart(emoji, token) {
    return new Promise((resolve, reject) => {
      if (emoji.is_alias === 1) {
       resolve({
          'token': token,
          'name': emoji.name,
          'mode': 'alias',
          'alias_for': emoji.alias_for
        });
      } else {
        FileUtils.getData(emoji.url).then(emojiData => {
          resolve({
            'token': token,
            'name': emoji.name,
            'mode': 'data',
            'image': emojiData
          });
        });
      }
    });
  }

}

module.exports = EmojiAdd;
