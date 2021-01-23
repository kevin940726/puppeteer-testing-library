beforeEach(async () => {
  await html``;
});

export async function html(strings: TemplateStringsArray) {
  const string = strings.join('');

  await page.evaluate((_html) => {
    document.body.innerHTML = _html;
  }, string);
}
