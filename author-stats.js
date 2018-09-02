#!/usr/bin/env node

const fs = require('fs');
const _ = require('lodash');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');
const program = require('commander');
const json = require('json');

// Consts
NOW = Date.now();
CACHE_MAX_AGE = NOW - 1;
PAGE_SIZE = 500;
ENDPOINTS = {
  addEmoji: '/emoji.add',
  emojiStats: '/emoji.adminList'
}

const throttle = new Throttle({
  active: true,
  concurrent: 5,
  rate: Infinity
});

function slackUrl(subdomain, endpoint) {
  return `https://${subdomain}.slack.com/api${endpoint}`
}

var emojiTotal = 0;


// pull in command line or file config
function main() {
  program
    .version(require('./package').version)
    .option('-d, --debug', 'Run in debug mode')
    .option('-c, --config [value]', 'a configuration file to hold required variables otherwise passed in as parameters. See config.json for an example.')
    .option('-s, --subdomain [value]', 'slack subdomain')
    .option('-t, --token [value]', 'slack user token. ususaly starts xoxp-...')
    .option('-u, --user [value]', 'slack user you\'d like to get stats on')
    .option('--no-cache', 'force a redownload of all cached info.')
    .parse(process.argv)

  cache_expiry = process.noCache ? NOW : CACHE_MAX_AGE; //TODO

  return new Promise((resolve, reject) => {
    pullAuthorStatsLoop(program.token, program.subdomain).then((emojiList) => {
      fs.writeFileSync(`./build/${program.subdomain}.adminList.json`, JSON.stringify(emojiList, null, 2));
      return emojiList;
    }).then((emojiList) => {
      if (program.user) {
        return summarizeUserStats(program.user, emojiList);
      } else {
        return summarizeTopUserStats(10, emojiList);
      }
    }).catch((err) => {
      console.log('error occured');
      console.log(err);
    });
  });
}

function pullAuthorStatsLoop(token, subdomain, emojiList, page) {
  return new Promise((resolve, reject) => {
    // First, find out how many pages we'll need to download
    slackRequest(subdomain, ENDPOINTS.emojiStats, {
      'query': '',
      'page': 1,
      'count': 1,
      'token': token
    }).then(body => {
      if (!body.emoji || body.emoji.length === 0) {
        reject('Slack is not returning any emoji');
      }
      console.log(`found ${body.custom_emoji_total_count} total emoji`);
      return body.custom_emoji_total_count;
    // Next, create a promise for each page
    }).then(count => {
      emojiTotal = count;
      let pages = (count / PAGE_SIZE) + 1;
      let promiseArray = [];
      for (var i = 0; i <= pages; i++) {
        promiseArray.push(
          slackRequest(subdomain, ENDPOINTS.emojiStats, {
            'query': '',
            'page': i,
            'count': PAGE_SIZE,
            'token': token
          }).then(body => {
            if (!body.emoji || body.emoji.length === 0) {
              reject('Slack is not returning any emoji');
            }
            console.log(`received page ${body.paging.page}/${body.paging.pages}`);
            return body.emoji;
          })
        );
      }
      // Once we have all the emoji pages, combine them.
      Promise.all(promiseArray).then((resultArray) => {
        fullList = [].concat.apply([], resultArray);
        console.log(`passing on ${fullList.length} emoji`);
        resolve(fullList);
      });
    }).catch(err => {
      throw err;
    });
  });
}

function slackRequest(subdomain, endpoint, fields) {
  return new Promise((resolve, reject) => {
    req = superagent.post(slackUrl(subdomain, ENDPOINTS.emojiStats))
    req.use(throttle.plugin())
    Object.keys(fields).forEach((key) => {
      req.field(key, fields[key]);
    });
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

function arrangeUsers(emojiList) {
  return _.groupBy(emojiList, 'user_display_name');
}

// give a count and percentage of all emoji created by userName
function summarizeUserStats(userName, emojiList) {
  let arrangedEmoji = arrangeUsers(emojiList);
  if (!(userName in arrangedEmoji)) {
    console.log(`Could not find ${userName} in emoji contributors`);
    return;
  }

  let userEmoji = arrangedEmoji[userName];
  let userTotal = userEmoji.length;
  let originals = _.filter(userEmoji, {'is_alias': 0}).length;
  let aliases = userTotal - originals;
  let percentage = ((userTotal * 1.000) / emojiTotal) * 100.000;
  console.log(`${userName} has created ${userTotal} emoji, ${originals} originals and ${aliases} aliases, ${percentage}% of the total emoji population`);

  let safeUserName = userName.toLowerCase().replace(/ /g, '-');
  fs.writeFileSync(`./build/${safeUserName}.${program.subdomain}.adminList.json`, JSON.stringify(userEmoji, null, 2));
}

// give user stats for top count contributors
function summarizeTopUserStats(count) {
  console.log('summarizeTopUserStats');
}

if (require.main === module) {
  main()
    .then(() => {console.log('done')})
    .catch((err) => { console.log(`error ${err}`) });
}
