import { Page } from 'puppeteer';

interface Configuration {
  timeout: number;
  page: Page;
}

const config: Configuration = {
  timeout: 3000,
  page: (global as any).page,
};

function configure(configuration: Partial<Configuration>) {
  const previousConfig = { ...config };
  Object.assign(config, configuration);
  return previousConfig;
}

function getConfig() {
  return config;
}

export { getConfig, configure };
