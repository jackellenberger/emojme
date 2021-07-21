const yaml = require('js-yaml');
const superagent = require('superagent');
const fs = require('graceful-fs');

const logger = require('../logger');

const MAX_AGE = (1000 * 60 * 60 * 24); // one day
const VALID_FILENAME_CHARS = /[\w\-. ]+/;

function mkdirp(path) {
  const dirs = path.split('/');
  for (let i = 1; i <= dirs.length; i++) {
    const subPath = dirs.slice(0, i).join('/');
    if (!fs.existsSync(subPath)) fs.mkdirSync(subPath);
  }
}

function writeJson(path, data) {
  this.mkdirp('build');
  fs.writeFileSync(
    path,
    JSON.stringify(data, null, 2),
  );
}

function readJson(path) {
  if (!fs.existsSync(path)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function readYaml(path) {
  if (fs.existsSync(path)) {
    const contents = yaml.safeLoad(fs.readFileSync(path, 'utf8'));
    if (contents.emojis) {
      return contents.emojis;
    }
  }
  return {};
}

function isExpired(path, expirationTimestamp) {
  const currentTime = Date.now();
  let maxAge = currentTime - MAX_AGE;

  if (expirationTimestamp) {
    maxAge = Math.max(maxAge, expirationTimestamp);
  }

  if (!fs.existsSync(path) || fs.statSync(path).ctimeMs < maxAge) {
    return true;
  }
  logger.debug(`Cached request is still fresh. To force a new request, delete or move ${path}`);
  return false;
}

function saveData(data, path) {
  this.mkdirp('build');
  return new Promise((resolve) => {
    resolve(fs.writeFileSync(path, data, { encoding: 'base64' }));
  });
}

async function getData(path, options) {
  path = path || '';
  options = options || {};

  try {
    if (path.match(/^http.*/)) {
      const req = superagent.get(path);
      req.retry(3);
      req.buffer(true);
      if (options.throttle) {
        req.use(options.throttle.plugin());
      }
      const res = await req.parse(superagent.parse.image);

      return res.body;
    } if (path.match(/^data:/)) {
      return path.replace(/^.*base64,/, '');
    } if (path.match(/\.(gif|jpg|jpeg|png)/) && fs.existsSync(path)) {
      return fs.readFileSync(path);
    }
    throw new Error('Emoji Url does not contain acceptable data');
  } catch (e) {
    throw e;
  }
}

function sanitize(str) {
  return str
    .split('')
    .filter(s => VALID_FILENAME_CHARS.test(s)) // remove illegal characters
    .join('')
    .replace(/ +(?= )/g, '') // remove repeated spaces
    .trim();
}

module.exports = {
  mkdirp,
  writeJson,
  readJson,
  readYaml,
  isExpired,
  saveData,
  getData,
  sanitize,
};
