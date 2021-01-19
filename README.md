# Puppeteer Testing Library

Custom queries and Jest matchers for Puppeteer with enforced best practices.

## Installation

```sh
npm install --save-dev puppeteer-testing-library
yarn add -D puppeteer-testing-library
```

## Usage

```js
import { find, findAll } from 'puppeteer-testing-library';
import 'puppeteer-testing-library/extend-expect';
```

## Queries

### `find(query: Query, options: FindOptions): Promise<ElementHandle>`

```html
<button>My button</button>
```

```js
const button = await find({ role: 'button', name: 'My button' });
```

### `findAll(query: Query, options: FindAllOptions): Promise<ElementHandle[]>`

```html
<button>Button 1</button>
<button>Button 2</button>
```

```js
const buttons = await findAll({ role: 'button' });
```

## Matchers

### `toMatchQuery(query: Query)`

### `toBeElement(expectedElement: ElementHandle)`

### `toBeVisible()`

### `toHaveFocus()`
