import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeHtml } from '../src/lib/html.mjs';

describe('escapeHtml', () => {
  it('escapes all five HTML entities individually and combined', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#39;');
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  });

  it('neutralizes XSS payloads', () => {
    assert.equal(
      escapeHtml('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    assert.equal(
      escapeHtml(`<img src="x" onerror='alert(1)&'>`),
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&amp;&#39;&gt;'
    );
  });

  it('converts null and undefined to an empty string', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  it('preserves falsy non-nullish primitives as strings', () => {
    assert.equal(escapeHtml(0), '0');
    assert.equal(escapeHtml(false), 'false');
    assert.equal(escapeHtml(''), '');
    assert.equal(escapeHtml(42), '42');
  });

  it('leaves plain ASCII and CJK strings unchanged when safe', () => {
    assert.equal(escapeHtml('CCUS Policy Hub 2026'), 'CCUS Policy Hub 2026');
    assert.equal(
      escapeHtml('中国碳捕集、利用与封存政策研究'),
      '中国碳捕集、利用与封存政策研究'
    );
    assert.equal(
      escapeHtml('政策 <2026> & "试点"'),
      '政策 &lt;2026&gt; &amp; &quot;试点&quot;'
    );
  });
});
