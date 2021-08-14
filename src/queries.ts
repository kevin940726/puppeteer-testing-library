import { ElementHandle } from 'puppeteer';
import { QueryError, QueryEmptyError, QueryMultipleError } from './query-error';
import { config } from './configure';
import { waitFor } from './wait-for';
import {
  Query,
  ElementWithComputedAccessibilityInfo,
  QueryOptions,
  FindOptions,
} from './types';

interface NodeWithControl extends Node {
  control?: Element;
}

async function queryAll(
  { role, name, text, selector, ...properties }: Query,
  { root, page = config.page, visible = true }: QueryOptions = {}
) {
  let rootHandle = (await (root ||
    page.evaluateHandle('document'))) as ElementHandle;

  // Get the content frame document if the root is an iframe.
  if (await rootHandle.evaluate((node) => node.tagName === 'IFRAME')) {
    const contentFrame = await rootHandle.contentFrame();
    const contentFrameDocument = (await contentFrame?.evaluateHandle(
      'document'
    )) as ElementHandle;
    if (!contentFrameDocument) {
      throw new QueryError(
        'QueryIframeError',
        'Content frame document is not available in the iframe.'
      );
    }
    rootHandle = contentFrameDocument;
    root = contentFrameDocument;
  }

  const elementsHandle = await rootHandle.evaluateHandle(
    (_root, [_selector, _role, _name, _text, _visible]) => {
      function getFlatString(text: string): string {
        return text.replace(/\s+/g, ' ');
      }

      return (Array.from(
        (_root || document).querySelectorAll(_selector)
      ) as ElementWithComputedAccessibilityInfo[])
        .filter((node) => !_role || node.computedRole === _role)
        .filter((node) => {
          if (!_name) return true;

          // Manually compute the accessible name for elements with <label>
          // Chromium has a bug in `computedName` causes it to return an empty string
          let computedName = '';
          if (
            node
              .getAttribute('aria-labelledby')
              ?.split(' ')
              .some((id) => document.getElementById(id))
          ) {
            computedName = node.computedName;
          } else if (node.getAttribute('aria-label')) {
            computedName = node.computedName;
          } else if (node.labels?.length) {
            const labels = Array.from(node.labels);
            computedName = labels
              .filter((label: NodeWithControl) => label.control === node)
              .map((label) => getFlatString(label.textContent || ''))
              .filter((text) => !!text)
              .join(' ')
              .trim();
          } else {
            computedName = node.computedName;
          }

          if (_name.type === 'RegExp') {
            return RegExp(_name.source, _name.flags).test(computedName);
          }
          return computedName === _name;
        })
        .filter(
          (node) =>
            !_text ||
            (_text.type === 'RegExp'
              ? RegExp(_text.source, _text.flags).test(node.textContent || '')
              : node.textContent === _text)
        )
        .filter((node) => {
          if (!_visible) return true;
          const style = window.getComputedStyle(node);
          if (!style || style.visibility === 'hidden') return false;
          const rect = node.getBoundingClientRect();
          return !!(rect.top || rect.bottom || rect.width || rect.height);
        });
    },
    [
      selector || '*',
      role || '',
      name instanceof RegExp
        ? {
            type: 'RegExp',
            source: name.source,
            flags: name.flags,
          }
        : name || '',
      text instanceof RegExp
        ? {
            type: 'RegExp',
            source: text.source,
            flags: text.flags,
          }
        : text || '',
      visible,
    ]
  );

  const elements = [];
  const elementsHandleProperties = await elementsHandle.getProperties();
  await elementsHandle.dispose();
  for (const property of elementsHandleProperties.values()) {
    const element = property.asElement();

    if (!element) {
      continue;
    }

    const propertiesKeys = Object.keys(properties);
    if (!propertiesKeys.length) {
      elements.push(element);
    } else {
      const elementSnapshot =
        (await page.accessibility.snapshot({
          root: element || undefined,
        })) || {};
      if (
        propertiesKeys.every((_property) => {
          const property = _property as Exclude<
            Exclude<Exclude<Exclude<keyof Query, 'role'>, 'name'>, 'text'>,
            'selector'
          >;
          return Object.is(elementSnapshot[property], properties[property]);
        })
      ) {
        elements.push(element);
      } else {
        await element.dispose();
      }
    }
  }

  return elements;
}

async function findAll(
  query: Query,
  { timeout = config.timeout, ...options }: FindOptions = {}
) {
  if (!query.role && !query.name && !query.selector && !query.text) {
    throw new QueryError(
      'QueryParametersError',
      'At least one of "role", "name", "text", or "selector" is required in the query.'
    );
  }

  return waitFor(
    async () => {
      const elements = await queryAll(query, options);
      if (!elements.length) {
        throw new QueryEmptyError(
          'Unable to find any nodes' + (timeout ? ` within ${timeout}ms.` : '.')
        );
      }
      return elements;
    },
    { timeout }
  );
}

async function find(query: Query, options: FindOptions = {}) {
  const elements = await findAll(query, options);

  if (elements.length > 1) {
    await Promise.all(elements.map((elementHandle) => elementHandle.dispose()));

    throw new QueryMultipleError('Found more than one node.');
  }

  const [element] = elements;

  return element;
}

export { findAll, find };
