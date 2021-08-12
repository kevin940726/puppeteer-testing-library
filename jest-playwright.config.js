const { launchArgs } = require('./');

module.exports = {
  launchOptions: {
    headless: process.env.HEADLESS !== 'false',
    args: launchArgs(),
  },
};
