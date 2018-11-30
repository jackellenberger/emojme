const _ = require('lodash');

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
  constructor(subdomain, token, output) {
    this.subdomain = subdomain;
    this.token = token;
    this.output = output || false;
    this.slack = new SlackClient(this.subdomain);
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

  async get(bustCache) {
    const path = `./build/${this.subdomain}.adminList.json`;

    if (bustCache || FileUtils.isExpired(path)) {
      const emojiLists = await this.getAdminListPages();
      const fullList = [].concat(...emojiLists);
      if (this.output) FileUtils.writeJson(path, fullList);
      return fullList;
    }
    const emojiList = FileUtils.readJson(path);
    console.log(`Found ${emojiList.length} emoji`);
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
    console.log(`Found ${firstPageBody.custom_emoji_total_count} total emoji on ${firstPageBody.paging.pages} pages`);

    for (let i = 2; i <= pages; i++) {
      promiseArray.push(
        this.slack.request(
          this.endpoint,
          this.createMultipart(i),
        ).then((body) => {
          if (!body.ok || !body.emoji || body.emoji.length === 0) {
            throw new Error(`Failed to fetch page ${i - 1}`);
          }
          process.stdout.write('.');
          return body.emoji;
        }).catch((err) => { console.log(`AdminList page request failed with ${err}`); }),
      );
    }

    return Promise.all(promiseArray).then(emojiLists => emojiLists.filter(Boolean));
  }

  // give a count and percentage of all emoji created by [user]
  static summarizeUser(emojiList, subdomain, users) {
    users = Helpers.arrayify(users);
    const groupedEmoji = _.groupBy(emojiList, 'user_display_name');

    return users.map((user) => {
      if (!(user in groupedEmoji)) {
        console.log(`Could not find ${user} in emoji contributors`);
        return false;
      }

      const userEmoji = groupedEmoji[user];
      const userTotal = userEmoji.length;
      const originals = _.filter(userEmoji, { is_alias: 0 }).length;
      const aliases = userTotal - originals;
      const percentage = (((userTotal * 1.0) / emojiList.length) * 100.0).toPrecision(4);

      console.log(`${user}'s emoji: \n\ttotal: ${userTotal} \n\toriginals: ${originals} \n\taliases: ${aliases} \n\tpercentage:${percentage}%`);

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
    console.log(`The top ${n} contributors for ${subdomain}'s ${emojiList.length} emoji are:`);
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

  static async save(emojiList, subdomain, options) {
    const groupedEmoji = _.groupBy(emojiList, 'user_display_name');
    const promiseArray = [];
    let subdomainDirCreated = options.saveAll ? false : true;
    let users = (options.saveAll || options.saveAllByUser)
      ? Object.keys(groupedEmoji)
      : Helpers.arrayify(options.save);

    users.forEach((user) => {
      let dirPath = `build/${subdomain}`;

      if (!(user in groupedEmoji)) {
        console.log(`Could not find ${user} in emoji contributors`);
        return Promise.resolve();
      }

      console.log(`Found ${groupedEmoji[user].length} emoji to save by ${user}.`);

      if (!options.saveAll) {
        dirPath = `${dirPath}/${user}`;
        FileUtils.mkdirp(dirPath);
      } else if (!subdomainDirCreated) {
        FileUtils.mkdirp(dirPath);
        subdomainDirCreated = true; // prevent wasting time trying to make and remake this
      }

      return groupedEmoji[user].forEach((emoji) => {
        try {
          let fileType;
          if (emoji.url.match(/^.*\.(gif|png|jpg|jpg)$/)) {
            fileType = emoji.url.split('.').slice(-1);
          } else if (emoji.url.match(/^data:.*/)) {
            fileType = emoji.url.match(/^data:image\/(gif|png|jpg|jpeg).*/)[1];
          } else {
            throw new Error('unable to retrieve emoji source url');
          }
          const path = `${dirPath}/${emoji.name}.${fileType}`;

          promiseArray.push(FileUtils.getData(emoji.url)
            .then(emojiData => FileUtils.saveData(emojiData, path))
            .then(() => { process.stdout.write('.'); return path; }));
        } catch (err) {
          // There is a bizarre case where you can make an alias for a default emoji
          // and all of a suddent it disappears? the url becomes `null` and `alias_for` = '1'???
          process.stdout.write('x');
        }
      });
    });

    return Promise.all(promiseArray);
  }
}

module.exports = EmojiAdminList;
