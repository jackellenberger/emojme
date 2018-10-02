const _ = require('lodash');

const SlackClient = require('./slack-client');
const FileUtils = require('./file-utils');

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
      'query': '',
      'page': page,
      'count': this.pageSize,
      'token': this.token
    }
  }

  async get(bustCache) {
    let path = `./build/${this.subdomain}.adminList.json`;

    if (bustCache || FileUtils.isExpired(path)) {
      let emojiLists = await this.getAdminListPages();
      let fullList = [].concat.apply([], emojiLists);
      if (this.output) FileUtils.writeJson(path, fullList);
      return fullList;
    } else {
      let emojiList = FileUtils.readJson(path);
      console.log(`Found ${emojiList.length} emoji`);
      return emojiList;
    }
  }

  async getAdminListPages() {
    let body = await this.slack.request(this.endpoint, this.createMultipart(1));
    if (!body.ok) {
      throw new Error(`Slack request failed with error ${body.error}`);
    }
    if (!body.emoji || body.emoji.length === 0) {
      throw new Error('Slack is not returning any emoji');
    }

    let pages = body.paging.pages;
    let promiseArray = [Promise.resolve(body.emoji)];
    console.log(`Found ${body.custom_emoji_total_count} total emoji on ${body.paging.pages} pages`);

    for (var i = 2; i <= pages; i++) {
      promiseArray.push(
        this.slack.request(
          this.endpoint,
          this.createMultipart(i)
        ).then(body => {
          if (!body.ok || !body.emoji || body.emoji.length === 0) {
            console.log(`Failed to fetch page ${i-1}`);
            return;
          }
          process.stdout.write('.');
          return body.emoji;
        }).catch(err => { console.log(`AdminList page request failed with ${err}`) })
      );
    }

    return Promise.all(promiseArray).then(emojiLists => emojiLists.filter(Boolean));
  }

  // give a count and percentage of all emoji created by [user]
  static summarizeUser(emojiList, subdomain, users) {
    users = Array.isArray(users) ? users : [users];
    let groupedEmoji = _.groupBy(emojiList, 'user_display_name');

    return users.map(user => {
      if (!(user in groupedEmoji)) {
        console.log(`Could not find ${user} in emoji contributors`);
        return;
      }

      let userEmoji = groupedEmoji[user];
      let userTotal = userEmoji.length;
      let originals = _.filter(userEmoji, {'is_alias': 0}).length;
      let aliases = userTotal - originals;
      let percentage = (((userTotal * 1.0) / emojiList.length) * 100.0).toPrecision(4);

      console.log(`${user} has created ${userTotal} emoji, ${originals} originals and ${aliases} aliases, ${percentage}% of the total emoji population`);

      let safeUserName = user.toLowerCase().replace(/ /g, '-');
      FileUtils.writeJson(`./build/${safeUserName}.${subdomain}.adminList.json`, userEmoji, null, 3);

      return {
        user: user,
        originals: originals,
        aliases: aliases,
        total: userTotal,
        percentage: percentage
      };
    }).filter(Boolean);
  }

  static summarizeSubdomain(emojiList, subdomain, n) {
    let groupedEmoji = _.countBy(emojiList, 'user_display_name');

    let sortedUsers = _.chain(groupedEmoji)
      .map((count, user) => { return {user: user, count: count}})
      .orderBy('count', 'desc')
      .value();
    console.log(`The top ${n} contributors for ${subdomain}'s ${emojiList.length} emoji are:`);
    let topUsers = sortedUsers.slice(0, n);
    topUsers.forEach((obj, index) => {
      console.log(`#${index+1}: ${obj.user} with ${obj.count} emoji`);
    });

    return topUsers;
  }

  static diff(srcLists, srcSubdomains, dstLists, dstSubdomains) {
    dstLists = dstLists || srcLists;
    dstSubdomains = dstSubdomains || srcSubdomains;

    let diffs = [];
    let uniqEmojiList = _.unionBy(...srcLists, 'name');

    _.zipWith(dstSubdomains, dstLists, (dstSubdomain, dstEmojiList) => {
      let missingEmojiList = _.differenceBy(uniqEmojiList, dstEmojiList, 'name');
      let path = `./build/diff.to-${dstSubdomain}.from-${_.without(srcSubdomains, dstSubdomain).join('-')}.adminList.json`;
      FileUtils.writeJson(path, missingEmojiList);
      diffs.push({subdomain: dstSubdomain, emojiList: missingEmojiList});
    });

    return diffs;
  }

  static async save(emojiList, subdomain, users) {
    users = users.length > 0 ? users : ['all'];
    let groupedEmoji = _.groupBy(emojiList, 'user_display_name');
    let promiseArray = [];

    users.forEach(user => {
      if (user != 'all' && !(user in groupedEmoji)) {
        console.log(`Could not find ${user} in emoji contributors`);
        return Promise.resolve();
      }

      console.log(`Found ${groupedEmoji[user].length} emoji to save by ${user}.`);
      let dirPath = `build/${subdomain}/${user}`;
      FileUtils.mkdirp(dirPath);

      groupedEmoji[user].forEach(emoji => {
        let fileType = emoji.url.split('.').slice(-1);
        let path = `${dirPath}/${emoji.name}.${fileType}`;

        promiseArray.push(FileUtils.getData(emoji.url)
          .then(emojiData => FileUtils.saveData(emojiData, path))
          .then(() => process.stdout.write('.'))
        )
      });
    });

    return await Promise.all(promiseArray);
  }
}

module.exports = EmojiAdminList;
