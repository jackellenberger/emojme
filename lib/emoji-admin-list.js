const _ = require('lodash');

const SlackClient = require('./slack-client');
const fileUtils = new(require('./file-utils'));

const ENDPOINT = '/emoji.adminList';
const PAGE_SIZE = 500;

// Methods and datastructures to retrieve
// parse, compare, and summarize results from
// the "emoji admin list" endpoint.
class EmojiAdminList {
  constructor(subdomain, token) {
    this.subdomain = subdomain;
    this.token = token;
    this.slack = new SlackClient(this.subdomain);
    this.endpoint = ENDPOINT;
    this.pageSize = PAGE_SIZE;
  }

  createMultipart(page) {
    return {
      'query': '',
      'page': page,
      'count': this.pageSize,
      'token': this.token
    }
  }

  get() {
    let path = `./build/${this.subdomain}.adminList.json`;

    return new Promise((resolve, reject) => {
      if (fileUtils.isExpired(path)) {
        this.getAdminList().then(emojiList => {
          fileUtils.writeJson(path, emojiList);
          resolve(emojiList);
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

  getAdminList() {
    // First, find out how many pages we'll need to download
    return this.slack.request(
      this.endpoint,
      this.createMultipart(1)
    ).then(body => {
      if (!body.emoji || body.emoji.length === 0) {
        reject('Slack is not returning any emoji');
      }
      let pages = body.paging.pages;
      let promiseArray = [Promise.resolve(body.emoji)];
      console.log(`found ${body.custom_emoji_total_count} total emoji`);

      for (var i = 1; i <= pages; i++) {
        promiseArray.push(
          this.slack.request(
            this.endpoint,
            this.createMultipart(i)
          ).then(body => {
            if (!body.ok) {
              reject(`Request to slack failed with "${res.body.error}"`);
            }
            if (!body.emoji || body.emoji.length === 0) {
              reject('Slack is not returning any emoji');
            }
            console.log(`received page ${body.paging.page}/${body.paging.pages}`);
            return body.emoji;
          }).catch(err => { console.log(`AdminList page request failed with ${err}`) })
        );
      }

      return Promise.all(promiseArray).then(resultArray => {
        let fullList = [].concat.apply([], resultArray);
        console.log(`passing on ${fullList.length} emoji`);
        return fullList;
      });
    }).catch(err => {
      console.log(`Unable to create slack client and retrieve AdminList`);
    });
  }

  // give a count and percentage of all emoji created by [user]
  summarizeUser(emojiList, users) {
    let groupedEmoji = _.groupBy(emojiList, 'user_display_name');
    _.each(users, (user) => {
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
    });
  }

  summarizeSubdomain(emojiList, n) {
    let groupedEmoji = _.countBy(emojiList, 'user_display_name');

    let sortedUsers = _.chain(groupedEmoji)
      .map((count, user) => { return {user: user, count: count}})
      .orderBy('count', 'desc')
      .value();
    console.log(`The top ${n} contributors for ${this.subdomain}'s ${emojiList.length} emoji are:`);
    sortedUsers.slice(0, n).forEach((obj, index) => {
      console.log(`#${index+1}: ${obj.user} with ${obj.count} emoji`);
    });
  }

  static diff(srcLists, srcSubdomains, dstLists, dstSubdomains) {
    dstLists = dstLists || srcLists;
    dstSubdomains = dstSubdomains || srcSubdomains;

    let diffsToUpload = [];
    let uniqEmojiList = _.unionBy(...srcLists, 'name');

    _.zipWith(dstSubdomains, dstLists, (dstSubdomain, dstEmojiList) => {
      let missingEmojiList = _.differenceBy(uniqEmojiList, dstEmojiList, 'name');
      let path = `./build/diff.to-${dstSubdomain}.from-${_.without(srcSubdomains, dstSubdomain).join('-')}.adminList.json`;
      fileUtils.writeJson(path, missingEmojiList);
      diffsToUpload.push({subdomain: dstSubdomain, emojiList: missingEmojiList});
    });

    return diffsToUpload;
  }
}

module.exports = EmojiAdminList;
