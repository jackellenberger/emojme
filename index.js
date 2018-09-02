const program = require('commander');
const AdminList = require('./lib/admin-list');


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

  adminList = new AdminList(program);
  return adminList.get();
}

if (require.main === module) {
  main()
    .then(() => {console.log('done')})
    .catch((err) => { console.log(`error ${err}`) });
}
