import { ElementHandle } from 'puppeteer';
import diff from 'jest-diff';
import { find } from './queries';
import { waitFor } from './wait-for';
import { QueryError } from './query-error';
import {
  Query,
  ElementWithComputedAccessibilityInfo,
  FindOptions,
} from './types';

async function toMatchQuery(
  this: jest.MatcherContext,
  elementHandle: ElementHandle,
  query: Partial<Query>,
  { page = (global as any).page } = {}
) {
  const snapshot =
    (await page.accessibility.snapshot({ root: elementHandle })) || {};

  if (query.text) {
    Object.assign(snapshot, {
      text: await elementHandle.evaluate((node) => node.textContent),
    });
  }

  // In some cases the accessibility snapshot won't return "role" even when it's defined
  if (query.role && !snapshot.role) {
    Object.assign(snapshot, {
      role: await elementHandle.evaluate(
        (node) => (node as ElementWithComputedAccessibilityInfo).computedRole
      ),
    });
  }

  let matches = true;
  if (query.selector) {
    matches = await elementHandle.evaluate(
      (node, selector) => node.matches(selector),
      query.selector
    );
  }

  const propertiesContaining: { [key: string]: any } = {};
  Object.entries(query).forEach(([key, property]) => {
    if (property instanceof RegExp) {
      propertiesContaining[key] = expect.stringMatching(property);
    } else if (key !== 'selector') {
      propertiesContaining[key] = property;
    }
  });

  const pass =
    matches &&
    this.equals(snapshot, expect.objectContaining(propertiesContaining));

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: pass
      ? () =>
          [
            this.utils.matcherHint('toMatchQuery', 'element', 'query', options),
            '\n',
            `Expected: not ${this.utils.printExpected(query)}`,
            `Received: ${this.utils.printReceived(snapshot)}`,
          ].join('\n')
      : () => {
          const diffString = diff(query, snapshot, {
            expand: this.expand,
          });
          return [
            this.utils.matcherHint('toMatchQuery', 'element', 'query', options),
            '\n',
            ...(diffString && diffString.includes('- Expect')
              ? ['Difference:', '\n', diffString]
              : [
                  `Expected: ${this.utils.printExpected(query)}`,
                  `Received: ${this.utils.printReceived(snapshot)}`,
                ]),
          ].join('\n');
        },
  };
}

async function toBeElement(
  this: jest.MatcherContext,
  elementHandle: ElementHandle,
  expectedElementHandle: ElementHandle
) {
  const pass = await elementHandle.evaluate(
    (node, expected) => Object.is(node, expected),
    expectedElementHandle
  );

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: () =>
      [
        this.utils.matcherHint(
          'toBeElement',
          'receivedElement',
          'expectedElement',
          options
        ),
        `Expected the elements to${this.isNot ? ' not ' : ' '}be the same.`,
      ].join('\n'),
  };
}

async function toBeVisible(
  this: jest.MatcherContext,
  elementHandle: ElementHandle,
  findOptions: FindOptions
) {
  let pass = false;
  let error: Error;

  try {
    await waitFor(async () => {
      pass = await elementHandle.evaluate((node) => {
        const style = window.getComputedStyle(node);
        if (!style || style.visibility === 'hidden') return false;
        const rect = node.getBoundingClientRect();
        return !!(rect.top || rect.bottom || rect.width || rect.height);
      });

      if (pass === this.isNot) {
        throw false;
      }
    }, findOptions);
  } catch (err) {
    error = err;
  }

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: () =>
      error
        ? [
            this.utils.matcherHint('toBeVisible', 'element', '', options),
            `Instead, it throws the following error:`,
            '',
            error,
          ].join('\n')
        : [
            this.utils.matcherHint('toBeVisible', 'element', '', options),
            `Expected the element to${pass ? ' not ' : ' '}be visible.`,
          ].join('\n'),
  };
}

async function toHaveFocus(
  this: jest.MatcherContext,
  elementHandle: ElementHandle,
  findOptions: FindOptions
) {
  let pass = false;
  let error: Error;

  try {
    await waitFor(async () => {
      pass = await elementHandle.evaluate(
        (node) => node === document.activeElement
      );

      if (this.isNot === pass) {
        throw false;
      }
    }, findOptions);
  } catch (err) {
    error = err;
  }

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: () =>
      error
        ? [
            this.utils.matcherHint('toHaveFocus', 'element', '', options),
            `Instead, it throws the following error:`,
            '',
            error,
          ].join('\n')
        : [
            this.utils.matcherHint('toHaveFocus', 'element', '', options),
            `Expected the element to${this.isNot ? ' not ' : ' '}have focus.`,
          ].join('\n'),
  };
}

async function toThrowQueryEmptyError(
  this: jest.MatcherContext,
  promise: Promise<ElementHandle>
): Promise<jest.CustomMatcherResult> {
  let error: Error | null = null;
  let pass = false;

  try {
    await promise;
  } catch (err) {
    error = err;
  }

  pass = error?.name === 'QueryEmptyError';

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: () =>
      error != null
        ? [
            this.utils.matcherHint(
              'toThrowQueryEmptyError',
              'query',
              '',
              options
            ),
            'Expected the query to throw "QueryEmptyError", instead it throws the following error.',
            error,
          ].join('\n')
        : [
            this.utils.matcherHint(
              'toThrowQueryEmptyError',
              'query',
              '',
              options
            ),
            'Expected the query to throw "QueryEmptyError", instead it didn\'t throw any errors.',
          ].join('\n'),
  };
}

async function toBeFound(
  this: jest.MatcherContext,
  query: Query,
  findOptions: FindOptions = {}
): Promise<jest.CustomMatcherResult> {
  let pass: boolean;
  let error: Error;

  try {
    pass = await waitFor(
      async () => {
        try {
          await find(query, { ...findOptions, timeout: 0 });

          if (this.isNot) {
            throw true;
          } else {
            return true;
          }
        } catch (err) {
          if (err === true) {
            throw new QueryError(
              'QueryFoundError',
              'Found an element matching the query.'
            );
          }
          if (err instanceof QueryError) {
            if (this.isNot) {
              return false;
            } else {
              throw err;
            }
          }
          throw err;
        }
      },
      { timeout: findOptions.timeout }
    );
  } catch (err) {
    pass = err.name === 'QueryFoundError';
    error = err;
  }

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: () =>
      [
        this.utils.matcherHint('toBeFound', 'query', 'findOptions', options),
        '',
        ...(error ? ['Instead, it throws the following error:', error] : []),
      ].join('\n'),
  };
}

export {
  toMatchQuery,
  toBeElement,
  toBeVisible,
  toHaveFocus,
  toThrowQueryEmptyError,
  toBeFound,
};
