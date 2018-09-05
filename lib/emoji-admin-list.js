const _ = require('lodash');

const SlackClient = require('./slack-client');
const fileUtils = new(require('./file-utils'));

const ENDPOINT = '/emoji.adminList';
const PAGE_SIZE = 500;

class EmojiAdminList {
  constructor(args) {
    // If multiple tokens/subdomains are supplied, take only the first.
    this.token = Args.isArray(args.token) ? args.token[0] : args.token;
    this.subdomain = Args.isArray(args.subdomain) ? args.subdomain[0] : args.subdomain;
    this.slack = new SlackClient(this.subdomain);
    this.endpoint = ENDPOINT;
    this.user = args.user;
  }

  parts(page) {
    return {
      'query': '',
      'page': page,
      'count': PAGE_SIZE,
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
        });
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
      this.parts(1)
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
            this.parts(i)
          ).then(body => {
            if (!body.ok) {
              reject(`Request to slack failed with "${res.body.error}"`);
            }
            if (!body.emoji || body.emoji.length === 0) {
              reject('Slack is not returning any emoji');
            }
            console.log(`received page ${body.paging.page}/${body.paging.pages}`);
            return body.emoji;
          }).catch(err => { console.log(err) })
        );
      }

      return Promise.all(promiseArray).then(resultArray => {
        let fullList = [].concat.apply([], resultArray);
        console.log(`passing on ${fullList.length} emoji`);
        return fullList;
      });
    }).catch(err => {
      console.log(`Unable to retrieve AdminList`);
      throw err;
    });
  }

  // give a count and percentage of all emoji created by userName
  summarizeUserStats(emojiList) {
    let groupedEmoji = _.groupBy(emojiList, 'user_display_name');
    _.each(this.user, (user) => {
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
      fileUtils.writeJson(`./build/${safeUserName}.${this.subdomain}.adminList.json`, userEmoji, null, 2);
    });
  }
}

module.exports = EmojiAdminList;
