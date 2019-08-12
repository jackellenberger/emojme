/**
 * @description A module for parsing ISO8601 durations, based off of @tolu's https://github.com/tolu/ISO8601-duration
 */

/**
 * The pattern used for parsing ISO8601 duration (PnYnMnDTnHnMnS).
 * This does not cover the week format PnW.
 */

// PnYnMnDTnHnMnS
const numbers = '\\d+(?:[\\.,]\\d{0,3})?';
const weekPattern = `(${numbers}W)`;
const datePattern = `(${numbers}Y)?(${numbers}M)?(${numbers}D)?`;
const timePattern = `T(${numbers}H)?(${numbers}M)?(${numbers}S)?`;

const iso8601 = `P(?:${weekPattern}|${datePattern}(?:${timePattern})?)`;
const objMap = ['weeks', 'years', 'months', 'days', 'hours', 'minutes', 'seconds'];

/**
 * The ISO8601 regex for matching / testing durations
 */
const pattern = exports.pattern = new RegExp(iso8601);

/** Parse PnYnMnDTnHnMnS format to object
 * @param {string} durationString - PnYnMnDTnHnMnS formatted string
 * @return {Object} - With a property for each part of the pattern
 */
exports.parse = function parse(durationString) {
  // Slice away first entry in match-array
  return durationString.match(pattern).slice(1).reduce((prev, next, idx) => {
    prev[objMap[idx]] = parseFloat(next) || 0;
    return prev;
  }, {});
};

exports.before = function before(duration, startDate) {
  // Create two equal timestamps, add duration to 'then' and return time difference
  const timestamp = startDate ? startDate.getTime() : Date.now();
  const then = new Date(timestamp);

  then.setFullYear(then.getFullYear() - duration.years);
  then.setMonth(then.getMonth() - duration.months);
  then.setDate(then.getDate() - duration.days);
  then.setHours(then.getHours() - duration.hours);
  then.setMinutes(then.getMinutes() - duration.minutes);
  then.setSeconds(then.getSeconds() - duration.seconds);
  then.setMilliseconds(then.getMilliseconds() - duration.seconds * 1000);
  // Special case weeks
  then.setDate(then.getDate() - duration.weeks * 7);

  return then;
};
