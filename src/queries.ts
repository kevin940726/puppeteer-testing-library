import { ElementHandle, Page } from 'puppeteer';
import { QueryError } from './query-error';
import { config } from './configure';
import { Query } from './types';

interface QueryOptions {
  root?: ElementHandle;
  page?: Page;
}

interface FindOptions extends QueryOptions {
  timeout?: number | false;
}

interface FindAllOptions extends FindOptions {
  allowEmpty?: boolean;
}

interface ElementWithComputedAccessibilityInfo extends HTMLElement {
  computedName: string;
  computedRole: string;
}

async function queryAll(
  { role, name, selector, ...properties }: Query,
  { root, page = config.page }: QueryOptions = {}
) {
  if (!role && !name && !selector) {
    throw new QueryError(
      'QueryParametersError',
      'At least one of "role", "name", or "selector" is required in the query.'
    );
  }

  const elementsHandle = await page.evaluateHandle(
    (_root, _selector, _role, _name) => {
      return (Array.from(
        (_root || document).querySelectorAll(_selector)
      ) as ElementWithComputedAccessibilityInfo[]).filter(
        (node) =>
          (!_role || node.computedRole === _role) &&
          (!_name || _name.type === 'RegExp'
            ? RegExp(_name.source, _name.flags).test(node.computedName)
            : node.computedName === _name)
      );
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
      : name || ''
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
      const elementSnapshot = await page.accessibility.snapshot({
        root: element || undefined,
      });
      if (
        propertiesKeys.every((_property) => {
          const property = _property as Exclude<
            Exclude<Exclude<keyof Query, 'role'>, 'name'>,
            'selector'
          >;
          Object.is(elementSnapshot[property], properties[property]);
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
  {
    timeout = config.timeout,
    page = config.page,
    allowEmpty = false,
    ...options
  }: FindAllOptions = {}
) {
  let elements = await queryAll(query, options);
  let hasTimeout = !timeout;

  if (timeout) {
    page.waitForTimeout(timeout).then(() => {
      hasTimeout = true;
    });
  }

  while (!elements.length && !hasTimeout) {
    await page.waitForTimeout(50);
    elements = await queryAll(query, options);
  }

  if (!allowEmpty && !elements.length) {
    if (timeout && hasTimeout) {
      throw new QueryError(
        'QueryTimeoutError',
        `Unable to find any nodes within the ${timeout}ms timeout.`
      );
    }

    if (!elements.length) {
      throw new QueryError('QueryEmptyError', 'Unable to find any nodes.');
    }
  }

  return elements;
}

async function find(query: Query, options: FindOptions = {}) {
  const elements = await findAll(query, { ...options, allowEmpty: false });

  if (elements.length > 1) {
    throw new QueryError('QueryMultipleError', 'Found more than one node.');
  }

  const [element, ...rest] = elements;

  await Promise.all(rest.map((elementHandle) => elementHandle.dispose()));

  return element;
}

export { findAll, find };
