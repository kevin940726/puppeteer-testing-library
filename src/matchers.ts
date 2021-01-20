import { ElementHandle, Page } from 'puppeteer';
import diff from 'jest-diff';
import { Query, ElementWithComputedAccessibilityInfo } from './types';

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

  if (query.visible != null) {
    Object.assign(snapshot, {
      visible: !!(await elementHandle.boundingBox()),
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

            diffString && diffString.includes('- Expect')
              ? ['Difference:', '\n', diffString]
              : [
                  `Expected: ${this.utils.printExpected(query)}`,
                  `Received: ${this.utils.printReceived(snapshot)}`,
                ],
          ]
            .flat()
            .join('\n');
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

async function toHaveFocus(
  this: jest.MatcherContext,
  elementHandle: ElementHandle
) {
  const pass = await elementHandle.evaluate(
    (node) => node === document.activeElement
  );

  const options = {
    isNot: this.isNot,
    promise: this.promise,
  };

  return {
    pass,
    message: () =>
      [
        this.utils.matcherHint('toHaveFocus', 'element', undefined, options),
        `Expected the element to${this.isNot ? ' not ' : ' '}have focus.`,
      ].join('\n'),
  };
}

export { toMatchQuery, toBeElement, toHaveFocus };
