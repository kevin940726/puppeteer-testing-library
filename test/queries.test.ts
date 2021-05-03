import { ElementHandle } from 'puppeteer';
import {
  find,
  findAll,
  QueryError,
  QueryEmptyError,
  QueryMultipleError,
} from '../';
import '../extend-expect';
import { html, sleep } from './test-utils';

it('should find elements', async () => {
  await html`
    <button>Button 1</button>
    <button>Button 2</button>
  `;

  const buttons = await findAll({ role: 'button' });

  expect(buttons.length).toBe(2);

  const button1 = await find({ role: 'button', name: 'Button 1' });
  const button2 = await find({ role: 'button', name: /button 2/i });

  await expect(button1).toMatchQuery({
    name: /button 1/i,
  });
  await expect(button2).toMatchQuery({
    name: 'Button 2',
  });

  await expect(buttons[0]).toBeElement(button1);
  await expect(buttons[1]).toBeElement(button2);

  await html`
    <label for="username">Username</label>
    <input id="username" />
  `;

  const input = await find({ role: 'textbox', name: 'Username' });
  await expect(input).toMatchQuery({ selector: '#username' });

  await input.type('My name');

  await expect(input).toMatchQuery({ value: 'My name' });

  await html`
    <section aria-labelledby="section-a">
      <h2 id="section-a">Section A</h2>
      <div role="group">A</div>
    </section>
    <section aria-labelledby="section-b">
      <h2 id="section-b">Section B</h2>
      <div role="group">B</div>
    </section>
    <div role="group">C</div>
  `;

  const sectionA = await find({ role: 'region', name: 'Section A' });
  const groupA = await find({ role: 'group' }, { root: sectionA });

  await expect(groupA).toMatchQuery({ text: 'A' });
});

it('should find elements eventually within timeout', async () => {
  const findButtonPromise = find({ role: 'button' });

  await sleep(100);

  await html`<button>Button</button>`;

  const button = await findButtonPromise;

  await expect(button).toMatchQuery({ name: 'Button' });

  await html``;

  const findAllButtonsPromise = findAll({ role: 'button' });

  await sleep(100);

  await html`
    <button>Button 1</button>
    <button>Button 2</button>
  `;

  const buttons = await findAllButtonsPromise;

  await expect(buttons[0]).toMatchQuery({ name: 'Button 1' });
  await expect(buttons[1]).toMatchQuery({ name: /button 2/i });
});

it('should throw errors when the elements are not found', async () => {
  try {
    await findAll({ role: 'button' }, { timeout: 0 });
  } catch (err) {
    expect(err).toBeInstanceOf(QueryEmptyError);
    expect(err).toBeInstanceOf(QueryError);
    expect(err.name).toBe('QueryEmptyError');
  }

  let findAllButtonPromise = findAll({ role: 'button' }, { timeout: 10 });
  await expect(findAllButtonPromise).rejects.toThrow(QueryEmptyError);
  await expect(findAllButtonPromise).rejects.toThrow(QueryError);
  await expect(findAllButtonPromise).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Unable to find any nodes within 10ms."`
  );
  await expect(findAllButtonPromise).toThrowQueryEmptyError();

  await html`
    <button>button 1</button>
    <button>button 2</button>
  `;

  try {
    await find({ role: 'button' });
  } catch (err) {
    expect(err).toBeInstanceOf(QueryMultipleError);
    expect(err).toBeInstanceOf(QueryError);
    expect(err.name).toBe('QueryMultipleError');
  }

  const findButtonPromise = find({ role: 'button' }, { timeout: 0 });
  await expect(findButtonPromise).rejects.toThrow(QueryError);
});

it('should only find visible elements by default', async () => {
  await html`
    <button hidden>hidden</button>
    <button style="display: none">display: none</button>
    <button style="visibility: hidden">visibility: hidden</button>
    <div style="display: none">
      <button>display: none in ancestor</button>
    </div>
    <div style="visibility: hidden">
      <button>visibility: hidden in ancestor</button>
    </div>
  `;

  const findAllVisibleButtonsPromise = findAll(
    { role: 'button' },
    { timeout: 0 }
  );
  await expect(findAllVisibleButtonsPromise).rejects.toThrow(QueryEmptyError);

  const allButtons = await findAll({ role: 'button' }, { visible: false });

  for (const button of allButtons) {
    await expect(button).not.toBeVisible();
  }
});

it('should handle inputs and labels', async () => {
  await html`
    <label for="search-box">Search</label>
    <input type="search" id="search-box" />
  `;

  await expect({ role: 'searchbox', name: 'Search' }).toBeFound();

  await html`
    <label id="search-box-label">Search</label>
    <input type="search" aria-labelledby="search-box-label" />
  `;

  await expect({ role: 'searchbox', name: 'Search' }).toBeFound();

  await html`
    <label>
      Search
      <input type="search" />
    </label>
  `;

  await expect({ role: 'searchbox', name: 'Search' }).toBeFound();

  await html`
    <label for="text-box">Title</label>
    <input type="text" id="text-box" />
  `;

  await expect({ role: 'textbox', name: 'Title' }).toBeFound();

  await html`
    <label for="text-box">Label 1</label>
    <label for="text-box">Label 2</label>
    <input type="text" id="text-box" />
  `;

  await expect({ role: 'textbox', name: 'Label 1 Label 2' }).toBeFound();
});

it('should handle iframes', async () => {
  await html`<iframe srcdoc="<button>Button</button>" />`;

  let iframe = (await page.$('iframe')) as ElementHandle;

  await expect({ role: 'button', name: 'Button' }).toBeFound({ root: iframe });

  await page.evaluate(() => {
    setTimeout(() => {
      const iframe = document.querySelector('iframe')!;
      iframe.srcdoc = '<input type="search" />';
    }, 100);
  });

  await expect({ role: 'searchbox' }).toBeFound({ root: iframe });
});

it('should persist stack trace', async () => {
  try {
    await find({ role: 'button' }, { timeout: 100 });
  } catch (err) {
    expect(
      err.stack
        .startsWith(`QueryEmptyError: Unable to find any nodes within 100ms.
    at Object.<anonymous> (${__filename}:`)
    ).toBe(true);
  }

  try {
    await findAll({ role: 'button' }, { timeout: 100 });
  } catch (err) {
    expect(
      err.stack
        .startsWith(`QueryEmptyError: Unable to find any nodes within 100ms.
    at Object.<anonymous> (${__filename}:`)
    ).toBe(true);
  }

  await html`<button>Button 1</button><button>Button 2</button>`;

  try {
    await find({ role: 'button' }, { timeout: 100 });
  } catch (err) {
    const stacks = err.stack.split('\n');
    expect(stacks[0]).toBe('QueryMultipleError: Found more than one node.');
    expect(stacks[1]).toEqual(expect.stringContaining('(internal/'));
    expect(stacks[2]).toEqual(
      expect.stringContaining(`    at Object.<anonymous> (${__filename}:`)
    );
  }
});
