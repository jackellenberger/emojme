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

  attachParts(req, hash, action) {
    _.each(hash, (val, key) => {
      if (key === '_attach') {
        this.attachParts(req, val, 'attach')
        // _.each(val, (v, k) => {
        //   req.attach(k, v);
        // });
        return;
      }
      if (typeof val.then == 'function') {
        val.then(promiseResult => {
          // req[action](key, promiseResult, {'contentType': 'image/jpg'});
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
        resolve(res.body);
      }).catch((err) => {
        console.log(err);
      });
    });
  }
}

module.exports = SlackClient;
