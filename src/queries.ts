import { setTimeout, clearTimeout } from 'timers';
import { ElementHandle, Page } from 'puppeteer';
import { QueryError, QueryEmptyError, QueryMultipleError } from './query-error';
import { config } from './configure';
import { Query, ElementWithComputedAccessibilityInfo } from './types';

interface QueryOptions {
  root?: ElementHandle;
  page?: Page;
  visible?: boolean;
}

interface FindOptions extends QueryOptions {
  timeout?: number | false;
}

async function queryAll(
  { role, name, text, selector, ...properties }: Query,
  { root, page = config.page, visible = true }: QueryOptions = {}
) {
  if (!role && !name && !selector && !text) {
    throw new QueryError(
      'QueryParametersError',
      'At least one of "role", "name", "text", or "selector" is required in the query.'
    );
  }

  const rootHandle = await (root || page.evaluateHandle('document'));
  const executionContext = rootHandle!.executionContext();

  const elementsHandle = await executionContext.evaluateHandle(
    (_root, _selector, _role, _name, _text, _visible) => {
      return (Array.from(
        (_root || document).querySelectorAll(_selector)
      ) as ElementWithComputedAccessibilityInfo[])
        .filter((node) => !_role || node.computedRole === _role)
        .filter((node) =>
          !_name || _name.type === 'RegExp'
            ? RegExp(_name.source, _name.flags).test(node.computedName)
            : node.computedName === _name
        )
        .filter((node) =>
          !_text || _text.type === 'RegExp'
            ? RegExp(_text.source, _text.flags).test(node.textContent || '')
            : node.textContent === _text
        )
        .filter((node) => {
          if (!_visible) return true;
          const style = window.getComputedStyle(node);
          if (!style || style.visibility === 'hidden') return false;
          const rect = node.getBoundingClientRect();
          return !!(rect.top || rect.bottom || rect.width || rect.height);
        });
    },
    root || '',
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
    visible
  );

  const elements = [];
  const elementsHandleProperties = await elementsHandle.getProperties();
  elementsHandle.dispose();
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
        element.dispose();
      }
    }
  }

  return elements;
}

async function findAll(
  query: Query,
  { timeout = config.timeout, ...options }: FindOptions = {}
) {
  let elements = await queryAll(query, options);
  let hasTimeout = !timeout;
  let timeoutID;

  if (timeout) {
    timeoutID = setTimeout(() => {
      hasTimeout = true;
    }, timeout);
  }

  while (!elements.length && !hasTimeout) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    elements = await queryAll(query, options);
  }

  if (!elements.length) {
    throw new QueryEmptyError(
      'Unable to find any nodes' + (timeout ? ` within ${timeout}ms.` : '.')
    );
  }

  if (timeoutID) {
    clearTimeout(timeoutID);
  }

  return elements;
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
