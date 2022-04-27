const _ = require('lodash');

const SlackClient = require('./slack-client');
const FileUtils = require('./util/file-utils');

const ENDPOINT = '/client.boot';
const FLANNEL_API_VER = '4';

// Methods to upload emoji to slack.
// Instance methods require slack client.
// Static methods do not.
class ClientBoot {
  constructor(subdomain, token, cookie, output) {
    this.subdomain = subdomain;
    this.token = token;
    this.cookie = cookie;
    this.output = output || false;
    this.slack = new SlackClient(this.subdomain, this.cookie, SlackClient.rateLimitTier(2));
    this.endpoint = ENDPOINT;
    this.flannel_api_ver = FLANNEL_API_VER;
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
      flannel_api_ver: this.flannel_api_ver,
    };
  }

  static extractEmojiUse(data) {
    const emojiToUsageMap = JSON.parse(data.prefs.emoji_use);
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
