const fs = require('fs');
const json = require('json');

const MAX_AGE = (1000 * 60 * 60 * 24); // one day

class FileUtils {
  constructor(maxAge) {
    maxAge = maxAge || MAX_AGE;

    this.currentTime = Date.now();
    this.maxAge = this.currentTime - maxAge;
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
}

module.exports = FileUtils;
