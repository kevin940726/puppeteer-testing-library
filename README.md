# Puppeteer Testing Library

Custom queries and Jest matchers for Puppeteer with enforced best practices.

## Usage

```js
import { find } from 'puppeteer-testing-library';
import 'puppeteer-testing-library/extend-expect';

// Given DOM of:
//   <label for="username">User Name</label>
//   <input id="username" />
//   <input type="submit" value="Submit" />

const userNameInput = await find({ role: 'textbox', name: 'User Name' });
await userNameInput.type('My name');
expect(userNameInput).toMatchQuery({ value: 'My name' });
const submitButton = await find({ role: 'button', name: 'Submit' });
await submitButton.click();
```

## Installation

```sh
npm install --save-dev puppeteer-testing-library
yarn add -D puppeteer-testing-library
```

`puppeteer-testing-library` needs a special flag to be passed to chromium for the queries to work. Import `launchArgs` and pass it to the `args` options in `puppeteer.launch`.

```js
import { launchArgs } from 'puppeteer-testing-library';

const browser = await puppeteer.launch({
  args: launchArgs(),
});
```

You can pass in additional args to `launchArgs()`, it will handle the merging for you.

```js
const browser = await puppeteer.launch({
  args: launchArgs(['--mute-audio']),
});
```

If you're using [`jest-puppeteer`](https://github.com/smooth-code/jest-puppeteer), pass it to `jest-puppeteer.config.js`

```js
// jest-puppeteer.config.js
const { launchArgs } = require('puppeteer-testing-library');

module.exports = {
  launch: {
    args: launchArgs(),
  },
};
```

`puppeteer-testing-library` expects there's a `page` variable globally to perform most of the queries. This is already the default in `jest-puppeteer`, so you don't have to do anything if you're using it. Or, you can directly assign `global.page` to the current `page` instance.

```js
global.page = await browser.newPage();
```

You can also use the `configure` API to assign them globally.

```js
import { configure } from 'puppeteer-testing-library';

const page = await browser.newPage();
configure({
  page,
});
```

If you'd rather do it explicitly on every query, you can pass your `page` instance to the options.

```js
const page = await browser.newPage();
const button = await find(
  { role: 'button' },
  { page }
);
```

Import from the `extend-expect` endpoint if you want to use all of the helpful [matchers](#matchers) in Jest. Either include it directly in the test file, or include it in the [`setupFilesAfterEnv`](https://jestjs.io/docs/en/configuration.html#setupfilesafterenv-array) array.

Import directly:

```js
import 'puppeteer-testing-library/extend-expect';

expect(elementHandle).toBeVisible();
```

In `setupFilesAfterEnv`:

```js
// jest.config.js
module.exports = {
  setupFilesAfterEnv: [
    'puppeteer-testing-library/extend-expect',
  ],
};
```

## Difference between [`pptr-testing-library`](https://github.com/testing-library/pptr-testing-library)

[`pptr-testing-library`](https://github.com/testing-library/pptr-testing-library) is a great library with the same purpose but with the same API as the `testing-library` family. It works by injecting `dom-testing-library` into the browser, and expose the API. Since `dom-testing-library` uses a pure JavaScript implementation of finding the `role` and `name` of the DOM element, it could fail in some cases where the the implementation doesn't cover. `puppeteer-testing-library` uses Chrome's `ComputedAccessibilityInfo` API to get their accessibility roles and names directly from the browser, hence could be a lot more predictable and match how the browser interprets the properties.

`puppeteer-testing-library` also uses a simmer but more powerful API to query the elements. Instead of choosing from the `findBy*` family, we can just use `find`/`findAll` to query almost all the elements.

[`jest-dom`](https://github.com/testing-library/jest-dom) is often used with the Testing Library family, to provide helpful custom Jest matchers. However, `jest-dom` doesn't support Puppeteer for now, which makes asserting difficult and tedious. `puppeteer-testing-library` bundles with a set of custom matchers which under the hood matches how the query system works, so that you can get the asserting for free with the same set of API.

## How to write queries

Writing accessible queries is a lot easier with the help of browser's devtools. Since `puppeteer-testing-library` only works with Chromium browsers, it's natural to also use the Chrome devtools.

Right click the element you want to query, and select "Inspect element". Let's say we want to select this button element with the text "Save settings".

![Right click the element and select "Inspect element"](https://user-images.githubusercontent.com/7753001/110895070-03c96380-8334-11eb-926a-2be9dca11f35.png)

The browser will open the devtools. You can see your element being highlighted in the "Elements" panel. Under "Accessibility" -> "Computed Properties", you can then see all the accessible properties of the element.

!["Elements" -> "Accessibility" -> "Computed Properties" in devtools](https://user-images.githubusercontent.com/7753001/110896540-ca462780-8336-11eb-9dda-8f51d3f423cf.png)

The most useful ones are `name` and `role`. Making a query is as simple as copying the values of them into your query.

```js
const saveSettingsButton = await find({
  role: 'button',
  name: 'Save settings',
});
```

Sometimes, there are more than one result of the query, and `puppeteer-testing-library` will throw an error if you're using `find`. You can fix that by adding more accessible properties into the query to narrow down the results. You can see the full list of the available properties in the [Puppeteer accessibility API doc](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#accessibilitysnapshotoptions).

## API

#### `configure({ page?: Page = global.page, timeout?: number = 3000 })`

Use `configure` to setup all the default options globally. Queries after `configure` will all use the updated defaults.

```js
import { configure } from 'puppeteer-testing-library';

configure({
  page,
  timeout: 5000,
});
```

`configure` will return the previous assigned config, so that you can restore the configuration back to its original state.

```js
// Change the default page for every query below
const originalConfig = configure({ page: newPage });

// Do some queries with the newPage...

// Restore back to the original configuration
configure(originalConfig);
```

### Queries

#### `find(query: Query, options: FindOptions): Promise<ElementHandle>`

Find the element matching the [`query`](#query). Will throw errors when there are no matching elements **or more than one matching elements**. By default, it will wait up to 3 seconds until finding the element. You can customize the timeout in the options.

Given the DOM of:

```html
<button>My button</button>
```

It finds the button with the specified `role` and `name`:

```js
const button = await find({ role: 'button', name: 'My button' });
```

##### `FindOptions`

The options has the following type:

```ts
interface FindOptions {
  page?: Page = global.page;
  timeout?: number | false = 3000;
  root?: ElementHandle;
  visible?: boolean = true;
}
```

You can customize the `timeout` to `0` or `false` to disable waiting for the element to appear in the DOM.

```js
const buttonShouldExist = await find(
  { role: 'button', name: 'My button' },
  { timeout: 0 }
);
```

You can specify `root` to limit the search to only within certain element.

```js
const buttonInTheFirstSection = await find(
  { role: 'button' },
  { root: firstSection }
);
```

By default, it will only find the elements that are visible in the page (not necessary visible in the viewport). You can disable this check by specifying `visible` to `false`. **Note that we just disable the check, the results could still contain visible elements.**

```js
const hiddenButton = await find(
  { role: 'button' },
  { visible: false }
);
```

#### `findAll(query: Query, options: FindOptions): Promise<ElementHandle[]>`

Find all the elements matching the [`query`](#query). Will throw errors when there are no matching elements. By default, it will wait up to 3 seconds until finding the elements. You can customize the timeout in the options.

Given the DOM of:

```html
<button>Button 1</button>
<button>Button 2</button>
```

It finds all the buttons with the specified `role`:

```js
const buttons = await findAll({ role: 'button' });
```

In the case where you want to assert if there're no matching elements, wrap the statement inside a try/catch block and check if the error name matches `QueryEmptyError`. You will probably want to also decrease the timeout value so that the test doesn't have to wait that long.

```js
try {
  const shouldBeEmptyResults = await findAll({ role: 'button' }, { timeout: 0 });
} catch (err) {
  if (err.name !== 'QueryEmptyError') {
    // Not expected error
    throw err;
  }
}
```

With Jest, you can wrap it in a assertion.

```js
await expect(findAll({ role: 'button' }, { timeout: 0 })).rejects.toThrow('QueryEmptyError');
```

Or, you can assert if the error matches `QueryEmptyError`.

```js
import { QueryEmptyError } from 'puppeteer-testing-library';

await expect(findAll({ role: 'button' }, { timeout: 0 })).rejects.toThrow(QueryEmptyError);
```

#### `Query`

A full list of possible fields in the query is as follow:

- role `<string>` The role.
- name `<string|RegExp>` A human readable name for the node.
- text `<string|RegExp>` Matches the `textContent` of the node.
- selector `<string>` A CSS selector to query the node.
- value `<string|number|RegExp>` The current value of the node.
- description `<string|RegExp>` An additional human readable description of the node.
- keyshortcuts `<string>` Keyboard shortcuts associated with this node.
- roledescription `<string|RegExp>` A human readable alternative to the role.
- valuetext `<string|RegExp>` A description of the current value.
- disabled `<boolean>` Whether the node is disabled.
- expanded `<boolean>` Whether the node is expanded or collapsed.
- focused `<boolean>` Whether the node is focused.
- modal `<boolean>` Whether the node is modal.
- multiline `<boolean>` Whether the node text input supports multiline.
- multiselectable `<boolean>` Whether more than one child can be selected.
- readonly `<boolean>` Whether the node is read only.
- required `<boolean>` Whether the node is required.
- selected `<boolean>` Whether the node is selected in its parent node.
- checked `<boolean|"mixed">` Whether the checkbox is checked, or "mixed".
- pressed `<boolean|"mixed">` Whether the toggle button is checked, or "mixed".
- level `<number>` The level of a heading.
- valuemin `<number>` The minimum value in a node.
- valuemax `<number>` The maximum value in a node.
- autocomplete `<string>` What kind of autocomplete is supported by a control.
- haspopup `<string>` What kind of popup is currently being shown for a node.
- invalid `<string>` Whether and in what way this node's value is invalid.
- orientation `<string>` Whether the node is oriented horizontally or vertically.

At least one of `role`, `name`, `text`, or `selector` is required in the query. While also preferring the order of `role` > `name` > `text` > `selector` when combining the query. Note that you can combine multiple fields together in your query to increase confidence.

### Matchers

All matchers below are asynchronous, remember to add `await` in front of the `expect` statement.

#### `toMatchQuery(query: Query)`

Test if the element matches the specified [`query`](#query).

```js
await expect(elementHandle).toMatchQuery({
  role: 'button',
  name: 'My button',
});
```

#### `toBeElement(expectedElement: ElementHandle)`

Test if the element is the same element as the `expectedElement`.

```js
await expect(elementHandle).toBeElement(myButton);
```

#### `toBeVisible()`

Test if the element is visible in the page (but not necessary visible in the viewport).

```js
await expect(elementHandle).toBeVisible();
```

#### `toHaveFocus()`

Test if the element has focus, i.e. if it is the `document.activeElement`.

```js
await expect(elementHandle).toHaveFocus();
```

#### `toThrowQueryEmptyError()`

Test if the query throw the `QueryEmptyError`. It's just a syntax sugar to manually catch the error and checking if the error is `QueryEmptyError`.

```js
const findAllButton = findAll(
  { role: 'button', name: 'not in the DOM' },
  { timeout: 0 }
);

await expect(findAllButton).toThrowQueryEmptyError();
```
