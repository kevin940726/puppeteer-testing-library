import { ElementHandle, Page } from 'puppeteer';
import { Query, FindOptions } from './types';
import * as matchers from './matchers';

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toMatchQuery(
        query: Partial<Query>,
        options?: { page?: Page }
      ): Promise<R>;
      toBeElement(expectedElement: ElementHandle): Promise<R>;
      toBeVisible(): Promise<R>;
      toHaveFocus(): Promise<R>;
      toThrowQueryEmptyError(): Promise<R>;
      toBeFound(options?: FindOptions): Promise<R>;
    }
  }
}

expect.extend(matchers);
