const fs = require('fs');
const _ = require('lodash');
const superagent = require('superagent');

const SlackClient = require('./slack-client');
const fileUtils = new(require('./file-utils'));

const ENDPOINT = '/emoji.add';

class EmojiAdd {
  constructor(subdomain, token) {
    this.subdomain = subdomain;
    this.token = token;
    this.slack = new SlackClient(this.subdomain);
    this.endpoint = ENDPOINT;
  }

  getData(path) {
    return new Promise((resolve, reject) => {
      if (path.match(/^http.*/)) {
        superagent.get(path)
          .buffer(true).parse(superagent.parse.image)
          .then(res => {
            resolve(res.body);
        });
      } else {
        resolve(fs.readFileSync(path));
      }
    });
  }

  //TODO rename parts to multipartSections or something
  parts(emoji) {
    return new Promise((resolve, reject) => {
      if (emoji.is_alias === 1) {
       resolve({
          'token': this.token,
          'name': emoji.name,
          'mode': 'alias',
          'alias_for': emoji.alias_for
        });
      } else {
        this.getData(emoji.url).then(emojiData => {
          resolve({
            'token': this.token,
            'name': emoji.name,
            'mode': 'data',
            'image': emojiData
          });
        });
      }
    });
  }

  uploadSingle(emoji) {
    return this.parts(emoji).then(parts => {
      console.log(`got parts for ${emoji.name}`); //TODO
      return this.slack.request(this.endpoint, parts)
    }).then(body => {
      if (!body.ok) {
        console.log(`error on ${emoji.name}: ${body.error}`);
        return Object.assign({}, emoji, { error: body.error });
      } else {
        console.log(`uploaded ${emoji.name}`);
        return false;
      }
    }).catch(err => { console.log(err) })
  }

  upload(src) {
    return new Promise((resolve, reject) => {
      let masterList, emojiList, aliasList;

      if (Array.isArray(src)) {
        masterList = src;
      } else if (!fs.existsSync(src)) {
        reject(`Emoji source file ${src} does not exist`);
      } else {
        masterList = fileUtils.readJson(src);
      }
      console.log(`Attempting to upload ${masterList.length} emoji to ${this.subdomain}`);

      [aliasList, emojiList] = _.partition(masterList, 'is_alias');
      return Promise.all(emojiList.map(emoji => this.uploadSingle(emoji)))
      .then(emojiResultArray => {
        return Promise.all(aliasList.map(emoji => this.uploadSingle(emoji)))
          .then(aliasResultArray => emojiResultArray.concat(aliasResultArray))
      }).then(resultArray => {
        let errors = _.filter(resultArray);
        let path = `./build/${this.subdomain}.emojiUploadErrors.json`;
        let errorJson = _.groupBy(errors, 'error');

        let totalCount = resultArray.length;
        let errorsCount = errors.length;
        let successCount = totalCount - errorsCount;
        console.log(`Out of ${totalCount} requests, encountered ${successCount} successes`);
        if (errorsCount > 0) {
          fileUtils.writeJson(path, errorJson);
          console.log(`And ${errorsCount} errors. View them in ${path}`);
        }
        resolve(true);
      });
    });
  }
}

module.exports = EmojiAdd;
