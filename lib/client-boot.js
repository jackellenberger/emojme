const fs = require('graceful-fs');
const _ = require('lodash');

const logger = require('./logger');
const SlackClient = require('./slack-client');
const FileUtils = require('./util/file-utils');

const ENDPOINT = '/client.boot';

// Methods to upload emoji to slack.
// Instance methods require slack client.
// Static methods do not.
class ClientBoot {
  constructor(subdomain, token, output) {
    this.subdomain = subdomain;
    this.token = token;
    this.output = output || false;
    this.slack = new SlackClient(this.subdomain, SlackClient.rateLimitTier(2));
    this.endpoint = ENDPOINT;
  }

  async get(bustCache) {
    const path = `./build/${this.subdomain}.clientBoot.json`;

    if (bustCache || FileUtils.isExpired(path)) {
      const bootData = await this.slack.request(this.endpoint, this.createMultipart());
      if (this.output) FileUtils.writeJson(path, bootData);
      return bootData;
    }
    return FileUtils.readJson(path);
  }

  createMultipart() {
    return {
      token: this.token,
    };
  }

  static extractEmojiUse(data) {
    const emojiToUsageMap = JSON.parse(data.self.prefs.emoji_use);
    const emojiToUsageArray = _.reduce(emojiToUsageMap, (acc, usage, name) => {
      acc.push({ name, usage });
      return acc;
    }, []);

    return _.orderBy(emojiToUsageArray, 'usage', 'desc');
  }

  static extractName(data) {
    return data.self.name;
  }
}

module.exports = ClientBoot;
