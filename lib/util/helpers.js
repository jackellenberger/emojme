const _ = require('lodash');

function validAuthTuples(subdomains, tokens, cookies) {
  return subdomains.length === tokens.length
    && tokens.length === cookies.length
    && _.every(subdomains, _.isString)
    && _.every(tokens, _.isString)
    && _.every(cookies, _.isString);
}

function validSrcDstPairs(options) {
  return options.srcSubdomains
    && options.srcTokens
    && options.srcCookies
    && (options.srcSubdomains.length === options.srcTokens.length)
    && (options.srcTokens.length === options.srcCookies.length)
    && options.dstSubdomains
    && options.dstTokens
    && options.dstCookies
    && (options.dstSubdomains.length === options.dstTokens.length)
    && (options.dstTokens.length === options.dstCookies.length);
}

function atLeastOneValidInputType(subdomains, tokens, cookies, options) {
  return (validAuthTuples(subdomains, tokens, cookies)
      && subdomains.length > 0)
    || (
      validSrcDstPairs(options)
      && options.srcSubdomains.length > 0
      && options.dstSubdomains.length > 0
    );
}

function zipAuthTuples(subdomains, tokens, cookies, options) {
  let srcPairs = [];
  let dstPairs = [];
  options = options || {};

  if (options && !_.isEmpty(options)
    && options.srcSubdomains && options.srcTokens && options.srcCookies) {
    srcPairs = _.zip(options.srcSubdomains, options.srcTokens, options.srcCookies);
    dstPairs = _.zip(options.dstSubdomains, options.dstTokens, options.dstCookies);
  }

  const authTuples = _.uniq(_.zip(subdomains, tokens, cookies).concat(srcPairs, dstPairs));

  if (!atLeastOneValidInputType(subdomains, tokens, cookies, options)) {
    throw new Error('Invalid input. Ensure that every given "subdomain" has a matching "token" and "cookie"');
  }

  return [authTuples, srcPairs, dstPairs];
}

function applyPrefix(emojiList, prefix) {
  return emojiList.map(e => ({ ...e, name: prefix + e.name }));
}

// Given an emoji, return its slug-name, i.e. the name without delimiter or id
function slugName(emoji, returnIdDelim) {
  let id; let idMatch; let delimiter; let
    delimiterMatch;
  let name = emoji.name;

  if (idMatch = name.match(/^[A-z-_]*([0-9])$/)) {
    id = parseInt(idMatch[1], 10);
    name = name.slice(0, -1);
  } else {
    id = 0;
  }

  if (delimiterMatch = name.match(/[-_]/g)) {
    delimiter = delimiterMatch.slice(-1);
    if (name.lastIndexOf(delimiter) === name.length - 1) {
      name = name.slice(0, -1);
    }
  } else {
    // If emoji1 collides, the next emoji is emoji2
    // If emoji collides, the next emoji is emoji-1
    delimiter = idMatch ? '' : '-';
  }

  if (returnIdDelim) return [name, id, delimiter];
  return name;
}

// Group array of emoji objects into hash of emojiSlug : emojiList
// where emojiSlug is the emoji name without delimiter or id
// e.g. emoji-1 and emoji_1 both have slug emoji
function groupEmoji(emojiList) {
  let maxId = -1;

  return _(emojiList).sortBy('name').groupBy((e) => {
    const [nameSlug, id] = slugName(e, true);
    maxId = (id > maxId) ? id : maxId;
    return nameSlug;
  }).reduce((acc, val, key) => {
    acc[key] = { list: val, maxId: 0 };
    return acc;
  }, {});
}

// Given array of existing emoji and an array of emoji to add
// rename new emoji to avoid colliding with existing emoji and themsevles.
function avoidCollisions(newEmoji, existingEmoji) {
  const usedNameList = existingEmoji.map(e => e.name);
  const completeNameList = usedNameList.concat(newEmoji.map(e => e.name));
  const groupedEmoji = groupEmoji(existingEmoji.concat(newEmoji));

  return newEmoji.map((emoji) => {
    if (!usedNameList.includes(emoji.name)) {
      usedNameList.push(emoji.name);
      return emoji;
    }

    const [nameSlug, id, delimiter] = slugName(emoji, true); // eslint-disable-line no-unused-vars
    let maxId = groupedEmoji[nameSlug].maxId += 1;
    let newName = `${nameSlug}${delimiter}${maxId}`;

    while (completeNameList.includes(newName)) {
      maxId = groupedEmoji[nameSlug].maxId += 1;
      newName = `${nameSlug}${delimiter}${maxId}`;
      usedNameList.push(emoji.name);
      completeNameList.push(emoji.name);
    }

    return { ...emoji, name: newName, collision: emoji.name };
  });
}

function formatResultsHash(resultsArray) {
  return _.reduce(resultsArray, (acc, elem) => {
    if (!elem.subdomain) {
      throw new Error('Found results unattached from subdomain');
    }

    acc[elem.subdomain] = _.omit(elem, 'subdomain');
    return acc;
  }, {});
}

function arrayify(elem) {
  return elem ? _.castArray(elem) : [];
}

module.exports = {
  arrayify,
  applyPrefix,
  avoidCollisions,
  groupEmoji,
  slugName,
  zipAuthTuples,
  formatResultsHash,
};
