const fs = require('graceful-fs');
const json = require('json');
const superagent = require('superagent');
const Throttle = require('superagent-throttle');

const MAX_AGE = (1000 * 60 * 60 * 24); // one day
const throttle = new Throttle({
  active: true,
  concurrent: 20,
  rate: Infinity
});


class FileUtils {
  constructor(maxAge) {
    maxAge = maxAge || MAX_AGE;

    this.currentTime = Date.now();
    this.maxAge = this.currentTime - maxAge;

    this.constructor.mkdirp('build');
  }

  static mkdirp(path) {
    let dirs = path.split('/');
    for (let i = 1; i <= dirs.length; i++) {
      let subPath = dirs.slice(0, i).join('/');
      if (!fs.existsSync(subPath))
        fs.mkdirSync(subPath);
    }
  }

  writeJson(path, data) {
    fs.writeFileSync(
      path,
      JSON.stringify(data, null, 2)
    );
  }

  readJson(path) {
    if (!fs.existsSync(path)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(path, 'utf8'));
  }

  isExpired(path) {
    if (!fs.existsSync(path) || fs.statSync(path).ctimeMs < this.maxAge) {
      return true;
    } else {
      console.log(`Cached request is still fresh. To force a new request, delete or move ${path}`);
      return false;
    }
  }

  static saveData(data, path) {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, data, {encoding: 'base64'}, (err) => {
        if (err) reject(err);
        resolve(path);
      });
    });
  }

  static getData(path) {
    return new Promise((resolve, reject) => {
      if (path.match(/^http.*/)) {
        superagent.get(path)
          .use(throttle.plugin())
          .buffer(true).parse(superagent.parse.image)
          .then(res => {
            resolve(res.body);
        });
      } else if (path.match(/^data:/)) {
        resolve(path);
      } else if (path.match(/\.(gif|jpg|jpeg|png)/) && fs.existsSync(path)) {
        resolve(fs.readFileSync(path));
      } else {
        reject('Emoji Url does not contain acceptable data');
      }
    });
  }

}

module.exports = FileUtils;
