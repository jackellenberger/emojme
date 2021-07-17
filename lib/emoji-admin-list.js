const _ = require('lodash');

const Throttle = require('superagent-throttle');
const logger = require('./logger');
const SlackClient = require('./slack-client');
const FileUtils = require('./util/file-utils');
const Helpers = require('./util/helpers');

const ENDPOINT = '/emoji.adminList';
const PAGE_SIZE = 500;

// Methods and datastructures to retrieve
// parse, compare, and summarize results from
// the "emoji admin list" endpoint.
// Instace methods require slack client.
// Static methods do not.
class EmojiAdminList {
  constructor(subdomain, token, cookie, output) {
    this.subdomain = subdomain;
    this.token = token;
    this.cookie = cookie;
    this.output = output || false;
    this.slack = new SlackClient(this.subdomain, this.cookie, SlackClient.rateLimitTier(3));
    this.endpoint = ENDPOINT;
    this.pageSize = PAGE_SIZE;
  }

  setPageSize(pageSize) {
    this.pageSize = pageSize || PAGE_SIZE;
  }

  createMultipart(page) {
    return {
      query: '',
      page,
      count: this.pageSize,
      token: this.token,
    };
  }

  async get(bustCache, sinceTimestamp) {
    let emojiList;
    const sinceString = sinceTimestamp ? `${sinceTimestamp}.` : '';
    const path = `./build/${sinceString}${this.subdomain}.adminList.json`;

    if (bustCache || FileUtils.isExpired(path)) {
      const emojiLists = await this.getAdminListPages();
      emojiList = this.constructor.since([].concat(...emojiLists), sinceTimestamp);
      if (this.output) FileUtils.writeJson(path, emojiList);
    } else {
      emojiList = FileUtils.readJson(path);
    }
    logger.info(`[${this.subdomain}] Found ${emojiList.length} emoji`);
    return emojiList;
  }

  async getAdminListPages() {
    const firstPageBody = await this.slack.request(this.endpoint, this.createMultipart(1));
    if (!firstPageBody.ok) {
      throw new Error(`Slack request failed with error ${firstPageBody.error}`);
    }
    if (!firstPageBody.emoji) {
      throw new Error('Unable to retrieve first page of emoji');
    }

    const { pages } = firstPageBody.paging;
    const promiseArray = [Promise.resolve(firstPageBody.emoji)];
    logger.info(`[${this.subdomain}] Found ${firstPageBody.custom_emoji_total_count} total emoji on ${firstPageBody.paging.pages} pages`);

    for (let i = 2; i <= pages; i++) {
      promiseArray.push(
        this.slack.request(
          this.endpoint,
          this.createMultipart(i),
        ).then((body) => {
          if (!body.ok || !body.emoji || body.emoji.length === 0) {
            throw new Error(`Failed to fetch page ${i - 1}`);
          }
          logger.debug(`[${this.subdomain}] retrieved page ${i - 1}`);
          return body.emoji;
        }).catch((err) => { logger.error(`[${this.subdomain}] AdminList page request failed with ${err}`); }),
      );
    }

    return Promise.all(promiseArray).then(emojiLists => emojiLists.filter(Boolean));
  }

  static find(emojiList, emojiName) {
    return _.find(emojiList, { name: emojiName });
  }

  // give a count and percentage of all emoji created by [user]
  static summarizeUser(emojiList, subdomain, users) {
    users = Helpers.arrayify(users);
    const groupedEmoji = _.groupBy(emojiList, 'user_display_name');

    return users.map((user) => {
      if (!(user in groupedEmoji)) {
        logger.warning(`[${subdomain}] Could not find ${user} in emoji contributors`);
        return false;
      }

      const userEmoji = groupedEmoji[user];
      const userTotal = userEmoji.length;
      const originals = _.filter(userEmoji, { is_alias: 0 }).length;
      const aliases = userTotal - originals;
      const percentage = (((userTotal * 1.0) / emojiList.length) * 100.0).toPrecision(4);

      logger.info(`[${subdomain}] ${user}'s emoji: \n\ttotal: ${userTotal} \n\toriginals: ${originals} \n\taliases: ${aliases} \n\tpercentage:${percentage}%`);

      return {
        user,
        userEmoji,
        subdomain,
        originalCount: originals,
        aliasCount: aliases,
        totalCount: userTotal,
        percentage,
      };
    }).filter(Boolean);
  }

  static summarizeSubdomain(emojiList, subdomain, n) {
    const groupedEmoji = _.countBy(emojiList, 'user_display_name');

    const sortedUsers = _.chain(groupedEmoji)
      .map((count, user) => ({ user, count }))
      .orderBy('count', 'desc')
      .value();
    logger.info(`[${subdomain}] The top ${n} contributors for ${subdomain}'s ${emojiList.length} emoji are:`);
    const topUsers = sortedUsers.slice(0, n);
    return this.summarizeUser(emojiList, subdomain, topUsers.map(e => e.user));
  }

  static diff(srcLists, srcSubdomains, dstLists, dstSubdomains) {
    dstLists = dstLists || srcLists;
    dstSubdomains = dstSubdomains || srcSubdomains;

    const diffs = [];
    const uniqEmojiList = _.unionBy(...srcLists, 'name');

    _.zipWith(dstSubdomains, dstLists, (dstSubdomain, dstEmojiList) => {
      const missingEmojiList = _.differenceBy(uniqEmojiList, dstEmojiList, 'name');
      diffs.push({
        dstSubdomain,
        srcSubdomains: _.without(srcSubdomains, dstSubdomains),
        emojiList: missingEmojiList,
      });
    });

    return diffs;
  }

  static since(emojiList, sinceTimestamp) {
    if (!sinceTimestamp) {
      return emojiList;
    }

    return _.filter(emojiList, ({ created }) => created > sinceTimestamp);
  }

  static async save(emojiList, subdomain, options) {
    const groupedEmoji = _.groupBy(emojiList, 'user_display_name');
    const promiseArray = [];
    const specialTier = SlackClient.rateLimitTier('special');
    const throttle = new Throttle({
      concurrent: process.env.SLACK_REQUEST_CONCURRENCY
        || specialTier.slackRequestConcurrency,
      rate: process.env.SLACK_REQUEST_RATE
        || specialTier.slackRequestRate,
      ratePer: process.env.SLACK_REQUEST_WINDOW
        || specialTier.slackRequestWindow,
    });
    let subdomainDirCreated = !options.saveAll;
    const users = (options.saveAll || options.saveAllByUser)
      ? Object.keys(groupedEmoji)
      : Helpers.arrayify(options.save);

    users.forEach((user) => {
      let dirPath = `build/${subdomain}`;

      if (!(user in groupedEmoji)) {
        logger.warning(`[${subdomain}] Could not find ${user} in emoji contributors`);
        return Promise.resolve();
      }

      logger.info(`[${subdomain}] Found ${groupedEmoji[user].length} emoji to save by ${user}.`);

      if (!options.saveAll) {
        dirPath = `${dirPath}/${user}`;
        FileUtils.mkdirp(dirPath);
      } else if (!subdomainDirCreated) {
        FileUtils.mkdirp(dirPath);
        subdomainDirCreated = true; // prevent wasting time trying to make and remake this
      }

      return groupedEmoji[user].forEach((emoji) => {
        let path = `${dirPath}/${emoji.name}`;
        try {
          let fileType;
          if (emoji.url.match(/^.*\.(gif|png|jpg|jpg)$/)) {
            fileType = emoji.url.split('.').slice(-1);
          } else if (emoji.url.match(/^data:.*/)) {
            fileType = emoji.url.match(/^data:image\/(gif|png|jpg|jpeg).*/)[1];
          } else {
            throw new Error('unable to retrieve emoji source url');
          }
          path += `.${fileType}`;

          promiseArray.push(FileUtils.getData(emoji.url, { throttle })
            .then(emojiData => FileUtils.saveData(emojiData, path))
            .then(() => { logger.debug(`[${subdomain}] saved ${emoji.name} to ${path}`); return path; }));
        } catch (err) {
          // There is a bizarre case where you can make an alias for a default emoji
          // and all of a suddent it disappears? the url becomes `null` and `alias_for` = '1'???
          logger.warning(`[${subdomain}] unable to save ${emoji.name} to ${path}`);
        }
      });
    });

    return Promise.all(promiseArray);
  }
}

module.exports = EmojiAdminList;
