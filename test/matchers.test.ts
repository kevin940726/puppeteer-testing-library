import { ElementHandle } from 'puppeteer';
import stripAnsi from 'strip-ansi';
import '../extend-expect';
import { html, sleep } from './test-utils';

describe('toMatchQuery', () => {
  it('Should match query', async () => {
    await html`<button id="button" aria-pressed="false">My button</button>`;

    const button = await page.$('#button');

    await expect(button).toMatchQuery({
      role: 'button',
      name: 'My button',
      pressed: false,
    });
  });

  it('Should not match query', async () => {
    await html`<button id="button" aria-pressed="false">My button</button>`;

    const button = await page.$('#button');

    await expect(button).not.toMatchQuery({
      role: 'button',
      name: 'My button',
      pressed: true,
    });
    await expect(button).not.toMatchQuery({
      name: 'My Button',
    });
    await expect(button).not.toMatchQuery({
      role: 'button',
      name: 'My button',
      selected: true,
    });
  });
});

describe('toBeElement', () => {
  it('Should match the same elements', async () => {
    await html`<button id="button">My button</button>`;

    const button1 = await page.$('#button');
    const button2 = (await page.$('button')) as ElementHandle;
    const button3 = (await page.$$('button'))[0];

    await expect(button1).toBeElement(button2);
    await expect(button1).toBeElement(button3);
    await expect(button2).toBeElement(button3);
  });

  it('Should not match different elements', async () => {
    await html`
      <button id="button1">My button 1</button>
      <button id="button2">My button 2</button>
    `;

    const button1 = await page.$('#button1');
    const button2 = (await page.$('#button2')) as ElementHandle;

    await expect(button1).not.toBeElement(button2);
  });
});

describe('toBeVisible', () => {
  it('Should match the visible elements', async () => {
    await html`
      <button id="button">Button</button>
      <div style="visibility: hidden">
        <div style="visibility: visible">
          <button id="nested">Nested button</button>
        </div>
      </div>
    `;

    const button = await page.$('#button');
    const nestedButton = await page.$('#nested');

    await expect(button).toBeVisible();
    await expect(nestedButton).toBeVisible();
  });

  it('Should not match the hidden elements', async () => {
    await html`
      <button id="hidden" hidden>Hidden button</button>
      <button id="display-none" style="display: none">
        Display none button
      </button>
      <button id="visibility-hidden" style="visibility: hidden">
        Visibility hidden button
      </button>
      <div hidden>
        <button id="parent-hidden">Parent hidden button</button>
      </div>
      <div style="display: none">
        <button id="parent-display-none">Parent display none button</button>
      </div>
      <div style="visibility: hidden">
        <button id="parent-visibility-hidden">
          Parent visibility hidden button
        </button>
      </div>
    `;

    const hiddenButton = await page.$('#hidden');
    const displayNoneButton = await page.$('#display-none');
    const visibilityHiddenButton = await page.$('#visibility-hidden');
    const parentHiddenButton = await page.$('#parent-hidden');
    const parentDisplayNoneButton = await page.$('#parent-display-none');
    const parentVisibilityHiddenButton = await page.$(
      '#parent-visibility-hidden'
    );

    await expect(hiddenButton).not.toBeVisible();
    await expect(displayNoneButton).not.toBeVisible();
    await expect(visibilityHiddenButton).not.toBeVisible();
    await expect(parentHiddenButton).not.toBeVisible();
    await expect(parentDisplayNoneButton).not.toBeVisible();
    await expect(parentVisibilityHiddenButton).not.toBeVisible();
  });

  it('should eventually match the visible element', async () => {
    await html`<button hidden id="button">Button</button>`;

    const button = await page.$('#button');

    let promise = expect(button).toBeVisible();

    await sleep(100);

    await button!.evaluate((node) => {
      node.hidden = false;
    });

    await promise;

    promise = expect(button).not.toBeVisible();

    await sleep(100);

    await button!.evaluate((node) => {
      node.hidden = true;
    });

    await promise;
  });
});

describe('toHaveFocus', () => {
  it('should match the current focused elements', async () => {
    await html`
      <input id="input" />
      <button id="button">button</button>
      <button id="not-focusable-button" tabindex="-1">Not focusable</button>
      <a id="link" href="#">Link</a>
    `;

    const body = (await page.$('body')) as ElementHandle;
    const input = await page.$('#input');
    const button = await page.$('#button');
    const link = await page.$('#link');

    await body.focus();
    await page.keyboard.press('Tab');
    await expect(input).toHaveFocus();
    await page.keyboard.press('Tab');
    await expect(button).toHaveFocus();
    await page.keyboard.press('Tab');
    await expect(link).toHaveFocus();
    await page.keyboard.press('Tab');
    await expect(body).toHaveFocus();
  });

  it('should eventually match the focused element', async () => {
    await html`<button id="button">Button</button>`;

    const button = await page.$('#button');

    let promise = expect(button).toHaveFocus();

    await sleep(100);

    await button!.focus();

    await promise;

    promise = expect(button).not.toHaveFocus();

    await sleep(100);

    await page.keyboard.press('Tab');

    await promise;
  });
});

describe('toBeFound', () => {
  it('should find the element', async () => {
    await html`<button>Button</button>`;

    await expect({
      role: 'button',
      name: 'Button',
    }).toBeFound();

    const expectPromise = expect({
      role: 'button',
      name: 'Button 2',
    }).toBeFound();

    await sleep(100);

    await html`<button>Button 2</button>`;

    await expectPromise;
  });

  it('should not find the element', async () => {
    await html`<button>Button</button>`;

    const expectPromise = expect({
      role: 'button',
      name: 'Button',
    }).not.toBeFound();

    await sleep(100);

    await html``;

    await expectPromise;

    await expect({ role: 'button', name: 'Button 2' }).not.toBeFound();
  });

  it('should throw errors', async () => {
    try {
      await expect({ role: 'button', name: 'Button' }).toBeFound({
        timeout: 100,
      });
    } catch (err) {
      expect(stripAnsi(err.toString())).toMatchInlineSnapshot(`
        "Error: expect(query).toBeFound(findOptions)

        Instead, it throws the following error:
        QueryEmptyError: Unable to find any nodes."
      `);

      const trace = err.stack.slice(
        err.stack.indexOf(err.message) + err.message.length + 1
      );

      expect(
        trace.startsWith(`    at Object.<anonymous> (${__filename}:`)
      ).toBe(true);
    }

    await html`<button>Button</button>`;

    try {
      await expect({ role: 'button', name: 'Button' }).not.toBeFound({
        timeout: 100,
      });
    } catch (err) {
      expect(stripAnsi(err.toString())).toMatchInlineSnapshot(`
        "Error: expect(query).not.toBeFound(findOptions)

        Instead, it throws the following error:
        QueryFoundError: Found an element matching the query."
      `);

      const trace = err.stack.slice(
        err.stack.indexOf(err.message) + err.message.length + 1
      );

      expect(
        trace.startsWith(`    at Object.<anonymous> (${__filename}:`)
      ).toBe(true);
    }
  });
});
