import MarkdownIt from 'markdown-it';

// MessageBubble.tsx renders every message (including cross-user Live Room
// content from other participants) through react-native-markdown-display's
// default parser without ever passing a custom `markdownit` instance or
// `html: true` — this test locks in that markdown-it's default (html
// disabled) actually escapes raw HTML/script payloads rather than passing
// them through, since that's the only thing standing between a malicious
// message and a stored-XSS on web. If this ever starts failing, someone
// introduced `html: true` (or a custom markdownit instance) somewhere and
// reopened that vulnerability.
describe('markdown rendering does not permit raw HTML/script injection', () => {
  const md = MarkdownIt({ typographer: true });

  it('escapes a <script> tag instead of rendering it', () => {
    const rendered = md.render('Hi <script>window.__xss_fired = true;</script> there');
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;');
  });

  it('escapes an onerror-based <img> payload instead of rendering it', () => {
    const rendered = md.render('<img src=x onerror="window.__xss_fired = true">');
    expect(rendered).not.toMatch(/<img[^&]/);
    expect(rendered).toContain('&lt;img');
  });
});
