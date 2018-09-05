const fs = require('fs');
const _ = require('lodash');
const superagent = require('superagent');

const SlackClient = require('./slack-client');
const fileUtils = new(require('./file-utils'));

const ENDPOINT = '/emoji.add';

class EmojiAdd {
  constructor(args) {
    this.token = args.token || '';
    this.subdomain = args.subdomain || '';
    this.slack = new SlackClient(this.subdomain);
    this.endpoint = ENDPOINT;
    this.emojiSource = args.source;
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
        //TODO
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
    debugger;
    return this.parts(emoji).then(parts => {
      return this.slack.request(this.endpoint, parts)
    }).then(body => {
      if (!body.ok) {
        return Object.assign({}, emoji, { error: body.error });
      } else {
        return false;
      }
    }).catch(err => { console.log(err) })
  }

  upload() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.emojiSource)) {
        reject(`Emoji source file ${this.emojiSource} does not exist`);
      }
      let emojiList = fileUtils.readJson(this.emojiSource)

      //TODO: get() from target to not even try uploading & clobbering
      let promiseArray = [];

      for (var i = 0; i < emojiList.length; i++) {
        promiseArray.push(this.uploadSingle(emojiList[i]));
      }

      return Promise.all(promiseArray).then(resultArray => {
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
