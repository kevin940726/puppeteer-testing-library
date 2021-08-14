import { configure, find, QueryError } from '../';
import { html, sleep } from './test-utils';
import '../extend-expect';

it('should configure default timeout', async () => {
  configure({ timeout: 0 });

  const findButtonPromise = find({ role: 'button' }).catch((err) => {
    expect(err).toBeInstanceOf(QueryError);
  });

  await sleep(10);
  await html`<button>Button</button>`;

  await findButtonPromise;
});

it('should configure default page', async () => {
  const newPage = await browser.newPage();

  await newPage.evaluate(() => {
    document.body.innerHTML = '<button>Button</button>';
  });

  configure({ page: newPage });

  await expect({ role: 'button' }).toBeFound();

  const button = await find({ role: 'button' });
  expect(button).toBeTruthy();

  await newPage.close();
});
