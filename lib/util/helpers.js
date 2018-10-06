const _ = require('lodash');

function validAuthPairs(subdomains, tokens) {
  return subdomains.length === tokens.length;
}

function validSrcDstPairs(options) {
  return options.srcSubdomains
    && options.srcTokens
    && (options.srcSubdomains.length === options.srcTokens.length)
    && options.dstSubdomains
    && options.dstTokens
    && options.dstSubdomains.length === options.dstTokens.length;
}

function atLeastOneValidInputType(subdomains, tokens, options) {
  return (validAuthPairs(subdomains, tokens) && subdomains.length > 0) || (validSrcDstPairs(options) && options.srcSubdomains.length > 0 && options.dstSubdomains.length > 0);
}

function zipAuthPairs(subdomains, tokens, options) {
  let srcPairs = [], dstPairs = [];
  let authPairs;

  if (options && options.srcSubdomains && options.srcTokens) {
    srcPairs = _.zip(options.srcSubdomains, options.srcTokens);
    dstPairs = _.zip(options.dstSubdomains, options.dstTokens);
  }

  authPairs = _.uniq(_.zip(subdomains, tokens).concat(srcPairs, dstPairs));

  if (!atLeastOneValidInputType(subdomains, tokens, options)) {
    throw new Error('Invalid input. Ensure that every given "subdomain" has a matching "token"');
  }

  return [authPairs, srcPairs, dstPairs];
}

function applyPrefix(emojiList, prefix) {
  return emojiList.map(e => {
    return {...e, name: prefix + e.name}
  });
}

function stripCounter(emoji, returnCountDelim) {
  let count, countMatch, delimiter, delimiterMatch;
  let name = emoji.name;

  if (countMatch = name.match(/^[A-z-_]*([0-9])$/)) {
    count = parseInt(countMatch[1], 10);
    name = name.slice(0, -1);
  } else {
    count = 0;
  }

  if (delimiterMatch = name.match(/[-_]/g)) {
    delimiter = delimiterMatch.slice(-1);
    if (name.lastIndexOf(delimiter) === name.length - 1) {
      name = name.slice(0, -1);
    }
  } else {
    //If emoji1 collides, the next emoji is emoji2
    //If emoji collides, the next emoji is emoji-1
    delimiter = countMatch ? '' : '-';
  }

  if (returnCountDelim)
    return [name, count, delimiter];
  else
    return name;
}

function groupEmoji(emojiList) {
  let nameSlug, count, delimiter;
  let maxCount = -1;

  return _(emojiList).sortBy('name').groupBy(e => {
    [nameSlug, count, delimiter] = stripCounter(e, true);
    maxCount = (count > maxCount) ? count : maxCount;
    return nameSlug;
  }).reduce((acc, val, key) => {
    acc[key] = {list: val, maxCount: 0};
    return acc;
  }, {});
}

function avoidCollisions(newEmoji, existingEmoji) {
  let usedNameList = existingEmoji.map(e => e.name);
  let completeNameList = usedNameList.concat(newEmoji.map(e => e.name));
  let groupedEmoji = groupEmoji(existingEmoji.concat(newEmoji));

  return newEmoji.map(emoji => {
    if (!usedNameList.includes(emoji.name)) {
      usedNameList.push(emoji.name);
      return emoji;
    }

    let [nameSlug, count, delimiter] = stripCounter(emoji, true);
    let maxCount = groupedEmoji[nameSlug].maxCount += 1;
    let newName = `${nameSlug}${delimiter}${maxCount}`;

    while (completeNameList.includes(newName)) {
      maxCount = groupedEmoji[nameSlug].maxCount += 1;
      newName = `${nameSlug}${delimiter}${maxCount}`;
      usedNameList.push(emoji.name);
      completeNameList.push(emoji.name);
    }

    return {...emoji, name: newName, collision: emoji.name};
  });
}

module.exports = {
  avoidCollisions: avoidCollisions,
  groupEmoji: groupEmoji,
  stripCounter: stripCounter,
  zipAuthPairs: zipAuthPairs
};
