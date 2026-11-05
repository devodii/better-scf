import { describe, expect, it } from 'vitest';
import { scrubHtml, stripSensitiveHeaders } from './scrub';

describe('stripSensitiveHeaders', () => {
  it('drops cookies, authorization and credential-like headers, lowercases the rest', () => {
    const kept = stripSensitiveHeaders({
      Cookie: 'a=b',
      'Set-Cookie': 'a=b',
      Authorization: 'Bearer x',
      'X-CSRF-Token': 'x',
      'X-Session-Id': 'x',
      'Content-Type': 'application/json',
      Accept: '*/*',
    });
    expect(kept).toEqual({ 'content-type': 'application/json', accept: '*/*' });
  });
});

describe('scrubHtml', () => {
  const address = `G${'B'.repeat(55)}`;
  const html = [
    '<script>window.__TOKEN__="abc"</script>',
    '<input type="hidden" name="csrf" value="s3cret">',
    '<input type="text" value="Jane Doe">',
    '<a href="mailto:jane@example.com">jane@example.com</a>',
    `<span>${address}</span>`,
    '<a href="/submissions/rec1234567890abcd">x</a>',
    '<a href="https://github.com/janedoe">gh</a>',
    '<a href="https://x.com/jane_doe/status/1">x</a>',
    '<a href="https://communityfund.stellar.org/cb?token=abc123&page=2">cb</a>',
    '<img class="a" src="https://cdn.example.com/jane.png?sig=1" srcset="a 1x, b 2x">',
    '<p>Jane Doe leads the team</p>',
  ].join('\n');

  it('replaces personal data with placeholders and counts each kind', () => {
    const { html: out, counts } = scrubHtml(html, ['Jane Doe']);
    expect(out).not.toContain('abc"');
    expect(out).not.toContain('s3cret');
    expect(out).not.toContain('jane@example.com');
    expect(out).not.toContain(address);
    expect(out).not.toContain('rec1234567890abcd');
    expect(out).not.toContain('janedoe');
    expect(out).not.toContain('jane_doe');
    expect(out).not.toContain('token=abc123');
    expect(out).not.toContain('jane.png');
    expect(out).not.toContain('srcset');
    expect(out).not.toContain('Jane Doe');
    expect(out).toContain('user@example.invalid');
    expect(out).toContain(`rec${'X'.repeat(14)}`);
    expect(out).toContain('https://github.com/example-user');
    expect(out).toContain('token=REDACTED&page=2');
    expect(out).toContain('<input type="text" value="">');
    expect(out).toContain('[redacted] leads the team');
    expect(counts).toMatchObject({
      scripts: 1,
      hiddenInputs: 1,
      inputValues: 1,
      stellarAddresses: 1,
      recordIds: 1,
      images: 1,
    });
    expect(counts.emails).toBeGreaterThanOrEqual(1);
    expect(counts.profileLinks).toBe(2);
  });

  it('blanks unquoted input values and textarea text', () => {
    const { html: out, counts } = scrubHtml(
      '<input type=text value=JaneDoe><textarea name="bio">Jane writes here</textarea>',
    );
    expect(out).not.toContain('JaneDoe');
    expect(out).not.toContain('Jane writes');
    expect(out).toContain('<textarea name="bio"></textarea>');
    expect(counts.inputValues).toBe(2);
  });

  it('replaces srcset on source, svg image hrefs and css url() in inline styles', () => {
    const { html: out } = scrubHtml(
      [
        '<picture><source srcset="https://cdn.example.com/jane-1x.png 1x, https://cdn.example.com/jane-2x.png 2x" type="image/png"><img src=https://cdn.example.com/jane.png></picture>',
        '<svg><image href="https://cdn.example.com/jane-avatar.svg" width="8"></image><image xlink:href=\'/u/jane.svg\'></image></svg>',
        '<div style="color: red; background-image: url(&quot;https://cdn.example.com/jane-bg.png&quot;)"></div>',
        "<div style='background:url(/u/jane-cover.jpg) no-repeat'></div>",
      ].join(''),
    );
    expect(out).not.toContain('jane');
    expect(out).toContain('color: red');
    expect(out).toContain('no-repeat');
  });

  it('blanks data attributes but keeps their names', () => {
    const { html: out, counts } = scrubHtml(
      '<div data-testid="submission-card" data-user=\'{"name":"Jane"}\' data-id=42 class="card"></div>',
    );
    expect(out).toBe('<div data-testid="" data-user="" data-id="" class="card"></div>');
    expect(counts.dataAttributes).toBe(3);
  });

  it('does not corrupt links that merely end like a profile host', () => {
    const plain =
      '<a href="https://box.com/foo">a</a><a href="https://cat.me/x">b</a><a href="https://tax.com/y">c</a>';
    const { html: out, counts } = scrubHtml(plain);
    expect(out).toBe(plain);
    expect(counts.profileLinks).toBe(0);
    expect(scrubHtml('see x.com/janedoe and www.github.com/jane').html).toBe(
      'see x.com/example-user and www.github.com/example-user',
    );
  });

  it('leaves markup without personal data unchanged', () => {
    const plain = '<section><h2>TEAM</h2><p>Hello</p></section>';
    expect(scrubHtml(plain).html).toBe(plain);
  });
});
