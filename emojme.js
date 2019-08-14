#!/usr/bin/env node
/* eslint-disable global-require */

const program = require('commander');

if (require.main === module) {
  program
    .version(require('./package').version)
    .command('download', 'download all emoji from given subdomain')
    .command('upload', 'upload source emoji to given subdomain')
    .command('add', 'upload source emoji to given subdomain')
    .command('user-stats', 'get emoji statistics for given user on given subdomain')
    .command('sync', 'get emoji statistics for given user on given subdomain')
    .command('favorites', 'get favorite emoji and personal emoji usage statistics')
    .parse(process.argv);
} else {
  module.exports = {
    add: require('./emojme-add').add,
    download: require('./emojme-download').download,
    upload: require('./emojme-upload').upload,
    sync: require('./emojme-sync').sync,
    userStats: require('./emojme-user-stats').userStats,
    favorites: require('./emojme-favorites').favorites,
  };
}
