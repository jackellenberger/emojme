const _ = require('lodash');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');

class SlackClient {
  constructor(subdomain) {
    this.subdomain = subdomain;
    this.throttle = new Throttle({
      active: true,
      concurrent: 5,
      rate: Infinity
    });

  }

  url(endpoint) {
    return `https://${this.subdomain}.slack.com/api${endpoint}`
  }

  request(endpoint, fields, files) {
    return new Promise((resolve, reject) => {
      let req = superagent.post(this.url(endpoint))
      req.use(this.throttle.plugin())
      if (fields) {
        _.each(fields, (val, key) => {
          req.field(key, val);
        });
      }
      if (files) {
        _.each(files, (val, key) => {
          req.attach(key, val);
        });
      }

      req.then((res) => {
        if (!res.body) {
          reject('No body received from slack');
        }
        if (!res.body.ok) {
          reject(`Request to slack failed with "${res.body.error}"`);
        }
        resolve(res.body);
      }).catch((err) => {
        console.log(err);
      });
    });
  }
}

module.exports = SlackClient;
