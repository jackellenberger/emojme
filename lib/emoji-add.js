const fs = require('graceful-fs');
const _ = require('lodash');

const logger = require('./logger');
const SlackClient = require('./slack-client');
const FileUtils = require('./util/file-utils');

const ENDPOINT = '/emoji.add';

// Methods to upload emoji to slack.
// Instance methods require slack client.
// Static methods do not.
class EmojiAdd {
  constructor(subdomain, token, cookie, output) {
    this.subdomain = subdomain;
    this.token = token;
    this.cookie = cookie;
    this.output = output || false;
    this.slack = new SlackClient(this.subdomain, this.cookie, SlackClient.rateLimitTier(2));
    this.endpoint = ENDPOINT;
  }

  async uploadSingle(emoji) {
    const parts = await this.constructor.createMultipart(emoji, this.token);
    try {
      const body = await this.slack.request(this.endpoint, parts);
      if (!body.ok) {
        throw new Error(body.error);
      }
    } catch (err) {
      logger.warning(`[${this.subdomain}] error on ${emoji.name}: ${err.message || err}`);
      return Object.assign({}, emoji, { error: err.message || err });
    }
    logger.debug(`[${this.subdomain}] ${emoji.name} uploaded successfully`);

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

    logger.info(`[${this.subdomain}] Attempting to upload ${masterList.length} emoji to ${this.subdomain}`);

    const [aliasList, emojiList] = _.partition(masterList, 'is_alias');
    const emojiResultArray = await Promise.all(
      emojiList.map(emoji => this.uploadSingle(emoji)),
    );
    const aliasResultArray = await Promise.all(
      aliasList.map(emoji => this.uploadSingle(emoji)),
    );

    const resultArray = emojiResultArray.concat(aliasResultArray);
    const errors = _.filter(resultArray);
    const totalCount = resultArray.length;
    const errorsCount = errors.length;
    const successCount = totalCount - errorsCount;
    logger.info(`\n[${this.subdomain}] Batch upload complete.\n  total requests: ${totalCount} \n  successes: ${successCount} \n  errors: ${errorsCount}`);
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
