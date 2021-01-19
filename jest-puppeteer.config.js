const { launchArgs } = require('./');

module.exports = {
  launch: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: launchArgs(),
  },
};
