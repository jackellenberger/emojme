const _ = require('lodash');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');
const sleep = require('util').promisify(setTimeout);
const logger = require('./logger');

class SlackClient {
  constructor(subdomain) {
    this.subdomain = subdomain;
    // Throttle requests to Slacks "Tier 3" limit,
    // 50 requests per minute, or one request per 1200ms.
    // Run a few requests simultaneously and hope Slack treats
    // it as an acceptable "burst".
    this.throttle = new Throttle({
      active: true,
      concurrent: process.env.SLACK_REQUEST_CONCURRENCY || 10,
      rate: process.env.SLACK_REQUEST_RATE || 45,
      ratePer: process.env.SLACK_REQUEST_WINDOW || 61000,
    });
    this.manualRetries = [];
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

    try {
      const res = await req;
      if (!res.body) {
        throw new Error('No body received from slack');
      }
      if (res.statusCode >= 400) {
        throw new Error(`Error response: ${res.statusCode} for req ${req.body}`);
      }
      return res.body;
    } catch (err) {
      let retryAfter;
      // Sometimes throttling our requests isn't enough and we still get rate limited.
      // In those cases, retry the request after however long Slack asks us to wait.
      if ((err.status === 429) && (retryAfter = err.response.headers['retry-after'] * 1000)) {
        logger.info(`Retrying ${endpoint} with ${parts.name} in ${retryAfter} ms`);
        await sleep(retryAfter);
        logger.debug(`Retrying ${endpoint} with ${parts.name} now`);
        await this.request(endpoint, parts);
      }
      throw new Error(`Caught error from Superagent "${err.message}" for req to ${endpoint}, ${parts.name}`);
    }
  }
}

module.exports = SlackClient;
