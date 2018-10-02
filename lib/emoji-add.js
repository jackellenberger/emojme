const fs = require('graceful-fs');
const _ = require('lodash');

const SlackClient = require('./slack-client');
const FileUtils = require('./file-utils');

const ENDPOINT = '/emoji.add';

// Methods to upload emoji to slack.
// Instance methods require slack client.
// Static methods do not.
class EmojiAdd {
  constructor(subdomain, token, output) {
    this.subdomain = subdomain;
    this.token = token;
    this.output = output || false;
    this.slack = new SlackClient(this.subdomain);
    this.endpoint = ENDPOINT;
  }

  async uploadSingle(emoji) {
    let parts = await this.constructor.createMultipart(emoji, this.token)
    let body = await this.slack.request(this.endpoint, parts);
    if (!body.ok) {
      console.log(`\nerror on ${emoji.name}: ${body.error}`);
      return Object.assign({}, emoji, { error: body.error });
    } else {
      process.stdout.write('.');
    }
    return;
  }

  async upload(src) {
    let masterList, emojiList, aliasList;

    if (Array.isArray(src)) {
      masterList = src;
    } else if (!fs.existsSync(src)) {
      throw new Error(`Emoji source file ${src} does not exist`);
    } else {
      masterList = FileUtils.readJson(src);
    }
    console.log(`Attempting to upload ${masterList.length} emoji to ${this.subdomain}`);

    [aliasList, emojiList] = _.partition(masterList, 'is_alias');
    let emojiResultArray = await Promise.all(emojiList.map(emoji => this.uploadSingle(emoji)));
    let aliasResultArray = await Promise.all(aliasList.map(emoji => this.uploadSingle(emoji)));
    let resultArray = emojiResultArray.concat(aliasResultArray);

    let errors = _.filter(resultArray);
    let path = `./build/${this.subdomain}.emojiUploadErrors.json`;
    let errorJson = _.groupBy(errors, 'error');

    let totalCount = resultArray.length;
    let errorsCount = errors.length;
    let successCount = totalCount - errorsCount;
    console.log(`Out of ${totalCount} requests, encountered ${successCount} successes`);
    if (errorsCount > 0) {
      if (this.output) FileUtils.writeJson(path, errorJson);
      console.log(`And ${errorsCount} errors. View them in ${path}`);
    }
    return {emojiList: masterList, errorsList: errors};
  }

  static async createMultipart(emoji, token) {
    if (emoji.is_alias === 1) {
      return {
        'token': token,
        'name': emoji.name,
        'mode': 'alias',
        'alias_for': emoji.alias_for
      };
    } else {
      let emojiData = await FileUtils.getData(emoji.url);
      return {
        'token': token,
        'name': emoji.name,
        'mode': 'data',
        'image': emojiData
      };
    }
  }

}

module.exports = EmojiAdd;
