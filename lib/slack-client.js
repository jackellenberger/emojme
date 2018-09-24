const _ = require('lodash');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');

class SlackClient {
  constructor(subdomain) {
    this.subdomain = subdomain;
    this.throttle = new Throttle({
      active: true,
      concurrent: 10,
      rate: Infinity
    });

  }

  url(endpoint) {
    return `https://${this.subdomain}.slack.com/api${endpoint}`
  }

  attachParts(req, hash, action) {
    _.each(hash, (val, key) => {
      if (key === '_attach') {
        this.attachParts(req, val, 'attach')
        return;
      }
      if (typeof val.then == 'function') {
        val.then(promiseResult => {
          req.attach(key, './test.jpg');
        });
      } else {
        req[action](key, val);
      }
    });
  }

  request(endpoint, parts) {
    return new Promise((resolve, reject) => {
      let req = superagent.post(this.url(endpoint))
      req.use(this.throttle.plugin())
      if (parts) {
        _.each(parts, (val, key) => {
          if (key === 'image') {
            req.attach(key,val, {'filename': parts.name});
          } else {
            req.field(key, val);
          }
        });
      }

      req.then((res) => {
        if (!res.body) {
          reject('No body received from slack');
        }
        if (res.statusCode >= 400) {
          reject(`Error response: ${res.statusCode} for req ${req.body}`);
        }
        resolve(res.body);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

module.exports = SlackClient;
