const _ = require('lodash');

const SlackClient = require('./slack-client');
const FileUtils = require('./file-utils');
const fileUtils = new FileUtils();

const ENDPOINT = '/emoji.adminList';
const PAGE_SIZE = 500;

// Methods and datastructures to retrieve
// parse, compare, and summarize results from
// the "emoji admin list" endpoint.
// Instace methods require slack client.
// Static methods do not.
class EmojiAdminList {
  constructor(subdomain, token) {
    this.subdomain = subdomain;
    this.token = token;
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

  get(shouldCache) {
    let path = `./build/${this.subdomain}.adminList.json`;

    return new Promise((resolve, reject) => {
      if (!shouldCache || fileUtils.isExpired(path)) {
        this.getAdminListPages().then(emojiLists => {
          let fullList = [].concat.apply([], emojiLists);
          fileUtils.writeJson(path, fullList);
          resolve(fullList);
        }).catch((err) => { throw err });
      } else {
        let emojiList = fileUtils.readJson(path);
        console.log(`Found ${emojiList.length} emoji`);
        resolve(emojiList);
      }
    }).catch((err) => {
      console.log('error occured');
      console.log(err);
    });
  }

  getAdminListPages() {
    // First, find out how many pages we'll need to download
    return this.slack.request(
      this.endpoint,
      this.createMultipart(1)
    ).then(body => {
      if (!body.ok) {
        return Promise.reject(`Slack request failed with error ${body.error}`);
      }
      if (!body.emoji || body.emoji.length === 0) {
        return Promise.reject('Slack is not returning any emoji');
      }
      let pages = body.paging.pages;
      let promiseArray = [Promise.resolve(body.emoji)];
      console.log(`Found ${body.custom_emoji_total_count} total emoji\nreceived page ${body.paging.page}/${body.paging.pages}`);

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
            console.log(`received page ${body.paging.page}/${body.paging.pages}`);
            return body.emoji;
          }).catch(err => { console.log(`AdminList page request failed with ${err}`) })
        );
      }

      return Promise.all(promiseArray).then(emojiLists => emojiLists.filter(Boolean));
    }).catch(err => {
      console.log(err);
      console.log(`Unable to create slack client and retrieve AdminList`);
    });
  }

  // give a count and percentage of all emoji created by [user]
  static summarizeUser(emojiList, users) {
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
      fileUtils.writeJson(`./build/${safeUserName}.${this.subdomain}.adminList.json`, userEmoji, null, 3);

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
    sortedUsers.slice(0, n).forEach((obj, index) => {
      console.log(`#${index+1}: ${obj.user} with ${obj.count} emoji`);
    });
  }

  static diff(srcLists, srcSubdomains, dstLists, dstSubdomains) {
    dstLists = dstLists || srcLists;
    dstSubdomains = dstSubdomains || srcSubdomains;

    let diffs = [];
    let uniqEmojiList = _.unionBy(...srcLists, 'name');

    _.zipWith(dstSubdomains, dstLists, (dstSubdomain, dstEmojiList) => {
      let missingEmojiList = _.differenceBy(uniqEmojiList, dstEmojiList, 'name');
      let path = `./build/diff.to-${dstSubdomain}.from-${_.without(srcSubdomains, dstSubdomain).join('-')}.adminList.json`;
      fileUtils.writeJson(path, missingEmojiList);
      diffs.push({subdomain: dstSubdomain, emojiList: missingEmojiList});
    });

    return diffs;
  }

  static save(emojiList, subdomain, users) {
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

    return Promise.all(promiseArray).then(() => emojiList);
  }
}

module.exports = EmojiAdminList;
