const _ = require('lodash');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');
const sleep = require('util').promisify(setTimeout);
const logger = require('./logger');

const RATE_LIMIT_TIER = {
  1: {
    slackRequestConcurrency: 1,
    slackRequestRate: 1,
    slackRequestWindow: 60000,
  },
  2: {
    slackRequestConcurrency: 5,
    slackRequestRate: 20,
    slackRequestWindow: 60000,
  },
  3: {
    slackRequestConcurrency: 11,
    slackRequestRate: 49,
    slackRequestWindow: 60000,
  },
  4: {
    slackRequestConcurrency: 25,
    slackRequestRate: 100,
    slackRequestWindow: 60000,
  },
  special: {
    slackRequestConcurrency: 200,
    slackRequestRate: 3000,
    slackRequestWindow: 60000,
  },
};

// slack why
const cookieName = 'd';

class SlackClient {
  constructor(subdomain, cookie, options) {
    this.subdomain = subdomain;
    this.cookie = cookie;
    this.backoffTime = 0;
    this.backoffs = [];
    // If not otherwise specified, use tier 2 rate limiting
    this.options = Object.assign({}, this.constructor.rateLimitTier(2), options);
    // Throttle requests to Slacks "Tier 2" limit,
    // 20 requests per minute, or one request per 3000ms.
    // Run a few requests simultaneously and hope Slack treats
    // it as an acceptable "burst".
    this.throttle = new Throttle({
      concurrent: process.env.SLACK_REQUEST_CONCURRENCY
        || this.options.slackRequestConcurrency,
      rate: process.env.SLACK_REQUEST_RATE
        || this.options.slackRequestRate,
      ratePer: process.env.SLACK_REQUEST_WINDOW
        || this.options.slackRequestWindow,
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
    if (this.backoffTime > 0) {
      logger.debug(`[${this.subdomain}] Waiting for ${this.backoffTime} to begin next request to ${endpoint}.`);
      await sleep(this.backoffTime);
    }

    const req = superagent.post(this.url(endpoint));
    req.use(this.throttle.plugin());
    req.set('Cookie', `${cookieName}=${this.cookie}`);
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

      if (this.backoffs.length) {
        this.backoffTime += (this.backoffs.pop() * this.options.slackRequestConcurrency);
        logger.debug(`[${this.subdomain}] ${this.backoffs.length} backoffs in the queue.`);
      } else {
        if (this.throttle.concurrent !== this.options.slackRequestConcurrency) {
          logger.debug(`[${this.subdomain}] Returning to default concurrency: ${this.options.slackRequestConcurrency} from previous ${this.throttle.concurrent}`);
        }

        // Once all backoffs have been satisfied, no longer apply any backoff or throttling.
        this.throttle.options({ concurrent: this.options.slackRequestConcurrency });
        this.backoffTime = 0;
      }

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
        logger.info(`[${this.subdomain}] Rate limiting detected.`);
        logger.debug(`[${this.subdomain}] Endpoint ${endpoint} rate limited. Will retry request after ${retryAfter} ms backoff`);

        // Prevent sending multiple requests later and re-angering the rate limiter
        this.throttle.options({ concurrent: 1 });
        this.backoffTime += retryAfter * this.options.slackRequestConcurrency;
        this.backoffs.push(retryAfter);

        return this.request(endpoint, parts);
      }
      throw new Error(`Caught error from Superagent "${err.message}" for req to ${endpoint}, ${parts.name}`);
    }
  }

  static rateLimitTier(tier) {
    return RATE_LIMIT_TIER[tier];
  }
}

module.exports = SlackClient;
