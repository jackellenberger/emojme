const _ = require('lodash');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');

class SlackClient {
  constructor(subdomain) {
    this.subdomain = subdomain;
    this.throttle = new Throttle({
      active: true,
      concurrent: 10,
      rate: Infinity,
    });
  }

  url(endpoint) {
    return `https://${this.subdomain}.slack.com/api${endpoint}`;
  }

  attachParts(req, hash, action) {
    _.each(hash, (val, key) => {
      if (key === '_attach') {
        this.attachParts(req, val, 'attach');
        return;
      }
      if (typeof val.then === 'function') {
        val.then(() => {
          req.attach(key, './test.jpg');
        });
      } else {
        req[action](key, val);
      }
    });
  }

  async request(endpoint, parts) {
    const req = superagent.post(this.url(endpoint));
    req.use(this.throttle.plugin());
    if (parts) {
      _.each(parts, (val, key) => {
        if (key === 'image') {
          req.attach(key, val, { filename: parts.name });
        } else {
          req.field(key, val);
        }
      });
    }

    const res = await req;
    if (!res.body) {
      throw new Error('No body received from slack');
    }
    if (res.statusCode >= 400) {
      throw new Error(`Error response: ${res.statusCode} for req ${req.body}`);
    }
    return res.body;
  }
}

module.exports = SlackClient;
