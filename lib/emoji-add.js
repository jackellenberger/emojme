const fs = require('graceful-fs');
const _ = require('lodash');

const SlackClient = require('./slack-client');
const FileUtils = require('./util/file-utils');

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
    const parts = await this.constructor.createMultipart(emoji, this.token);
    const body = await this.slack.request(this.endpoint, parts);
    if (!body.ok) {
      console.log(`\nerror on ${emoji.name}: ${body.error}`);
      return Object.assign({}, emoji, { error: body.error });
    }
    process.stdout.write('.');
    return false; // no error
  }

  async upload(src) {
    let masterList;

    if (Array.isArray(src)) {
      masterList = src;
    } else if (!fs.existsSync(src)) {
      throw new Error(`Emoji source file ${masterList} does not exist`);
    } else {
      masterList = FileUtils.readJson(src);
    }

    console.log(`Attempting to upload ${masterList.length} emoji to ${this.subdomain}`);

    const [aliasList, emojiList] = _.partition(masterList, 'is_alias');
    const emojiResultArray = await Promise.all(
      emojiList.map(emoji => this.uploadSingle(emoji)),
    ).then(results => results.filter(Boolean));
    const aliasResultArray = await Promise.all(
      aliasList.map(emoji => this.uploadSingle(emoji)),
    ).then(results => results.filter(Boolean));

    const resultArray = emojiResultArray.concat(aliasResultArray);
    const errors = _.filter(resultArray);
    const totalCount = resultArray.length;
    const errorsCount = errors.length;
    const successCount = totalCount - errorsCount;
    console.log(`\nrequests: ${totalCount} \nsuccesses: ${successCount} \nerrors: ${errorsCount}`);
    return { subdomain: this.subdomain, emojiList: masterList, errorList: errors };
  }

  static async createMultipart(emoji, token) {
    if (emoji.is_alias === 1) {
      return {
        token,
        name: emoji.name,
        mode: 'alias',
        alias_for: emoji.alias_for,
      };
    }
    const emojiData = await FileUtils.getData(emoji.url || emoji.src);
    return {
      token,
      name: emoji.name,
      mode: 'data',
      image: emojiData,
    };
  }
}

module.exports = EmojiAdd;
