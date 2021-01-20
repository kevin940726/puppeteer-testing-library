# Puppeteer Testing Library

Custom queries and Jest matchers for Puppeteer with enforced best practices.

## Installation

```sh
npm install --save-dev puppeteer-testing-library
yarn add -D puppeteer-testing-library
```

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

## Queries

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

#### `findAll(query: Query, options: FindAllOptions): Promise<ElementHandle[]>`

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

##### `FindAllOptions`

The options extends [`FindOptions`](#FindOptions) with the following type:

```ts
interface FindAllOptions extends FindOptions {
  allowEmpty?: boolean;
}
```

You can specify `allowEmpty` to true to allow empty results. Note that it will still try to search for elements within the `timeout`, remember to disable it if you just want to assert an empty result.

```js
const emptyButtonsList = await findAll(
  { role: 'button' },
  { allowEmpty: true, timeout: 0 }
);
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

## Matchers

Enable the matchers by importing from the `extend-expect` endpoint either directly in the test files or in any files in the [`setupFilesAfterEnv`](https://jestjs.io/docs/en/configuration.html#setupfilesafterenv-array) array.

```js
import 'puppeteer-testing-library/extend-expect';
```

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

Test if the element has focus, i.e. `document.activeElement`.

```js
await expect(elementHandle).toHaveFocus();
```
