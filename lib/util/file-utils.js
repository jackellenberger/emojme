const yaml = require('js-yaml');
const superagent = require('superagent');
const fs = require('graceful-fs');

const MAX_AGE = (1000 * 60 * 60 * 24); // one day

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

function isExpired(path) {
  const currentTime = Date.now();
  const maxAge = currentTime - MAX_AGE;
  if (!fs.existsSync(path) || fs.statSync(path).ctimeMs < maxAge) {
    return true;
  }
  console.log(`Cached request is still fresh. To force a new request, delete or move ${path}`);
  return false;
}

function saveData(data, path) {
  this.mkdirp('build');
  debugger;
  return new Promise((resolve, reject) => {
    resolve(fs.writeFileSync(path, data, { encoding: 'base64' }));
  });
}

async function getData(path) {
  path = path || '';
  if (path.match(/^http.*/)) {
    const res = await superagent.get(path)
      .buffer(true).parse(superagent.parse.image);
    return res.body;
  } if (path.match(/^data:/)) {
    return path.replace(/^.*base64,/,'');
  } if (path.match(/\.(gif|jpg|jpeg|png)/) && fs.existsSync(path)) {
    return fs.readFileSync(path);
  }
  throw new Error('Emoji Url does not contain acceptable data');
}

module.exports = {
  mkdirp,
  writeJson,
  readJson,
  readYaml,
  isExpired,
  saveData,
  getData,
};
