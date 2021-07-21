const assert = require('chai').assert;
const SlackClient = require('../../../lib/slack-client');

describe('SlackClient', () => {
  describe('constructor', () => {
    const tierTwoLimits = SlackClient.rateLimitTier(2);
    const tierThreeLimits = SlackClient.rateLimitTier(3);

    it('defaults to using tier 2 rate limiting when no limits are specified', () => {
      const slackClient = new SlackClient('subdomain', 'cookie');

      assert.deepEqual(slackClient.options, tierTwoLimits);
    });

    it('allows rate limit tier overrides to be set', () => {
      const slackClient = new SlackClient('subdomain', 'cookie', tierThreeLimits);

      assert.deepEqual(slackClient.options, tierThreeLimits);
    });

    it('overrides passed variables with environment variables when present', () => {
      process.env.SLACK_REQUEST_CONCURRENCY = 1;
      process.env.SLACK_REQUEST_RATE = 2;
      process.env.SLACK_REQUEST_WINDOW = 3;

      const slackClient = new SlackClient('subdomain', 'cookie', tierThreeLimits);

      assert.include(slackClient.throttle, {
        concurrent: '1',
        rate: '2',
        ratePer: '3',
      });

      delete process.env.SLACK_REQUEST_CONCURRENCY;
      delete process.env.SLACK_REQUEST_RATE;
      delete process.env.SLACK_REQUEST_WINDOW;
    });
  });
});
