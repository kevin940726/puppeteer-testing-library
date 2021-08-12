module.exports = {
  preset: process.env.PLAYWRIGHT ? 'jest-playwright-preset' : 'jest-puppeteer',
  transform: {
    '\\.(j|t)sx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(strip-ansi|ansi-regex)/)'],
};
