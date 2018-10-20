const json = require('json');
const yaml = require('js-yaml');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');
const fs = require('graceful-fs');

const MAX_AGE = (1000 * 60 * 60 * 24); // one day
const throttle = new Throttle({
  active: true,
  concurrent: 20,
  rate: Infinity
});

function mkdirp(path) {
  let dirs = path.split('/');
  for (let i = 1; i <= dirs.length; i++) {
    let subPath = dirs.slice(0, i).join('/');
    if (!fs.existsSync(subPath))
      fs.mkdirSync(subPath);
  }
}

function writeJson(path, data) {
  this.mkdirp('build');
  fs.writeFileSync(
    path,
    JSON.stringify(data, null, 2)
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
    const contents = yaml.safeLoad(fs.readFileSync(path, 'utf8'))
    if (contents.hasOwnProperty('emojis')) {
      return contents.emojis;
    }
  }
  return {};
}

function isExpired(path) {
  let currentTime = Date.now();
  let maxAge = currentTime - MAX_AGE;
  if (!fs.existsSync(path) || fs.statSync(path).ctimeMs < maxAge) {
    return true;
  } else {
    console.log(`Cached request is still fresh. To force a new request, delete or move ${path}`);
    return false;
  }
}

function saveData(data, path) {
  this.mkdirp('build');
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, {encoding: 'base64'}, (err) => {
      if (err) reject(err);
      resolve(path);
    });
  });
}

async function getData(path) {
  path = path || '';
  if (path.match(/^http.*/)) {
    let res = await superagent.get(path)
      .buffer(true).parse(superagent.parse.image);
    return res.body;
  } else if (path.match(/^data:/)) {
    return path;
  } else if (path.match(/\.(gif|jpg|jpeg|png)/) && fs.existsSync(path)) {
    return fs.readFileSync(path);
  } else {
    throw new Error('Emoji Url does not contain acceptable data');
  }
}

module.exports = {
  mkdirp: mkdirp,
  writeJson: writeJson,
  readJson: readJson,
  readYaml: readYaml,
  isExpired: isExpired,
  saveData: saveData,
  getData: getData
};
