// Sitewide Google Ads tag. Conversion events require their own supplied labels.
export const GOOGLE_TAG_ID = 'AW-18552575833';
export const GOOGLE_TAG = `<!-- marand:google-tag -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GOOGLE_TAG_ID}');
</script>
<!-- /marand:google-tag -->`;

export function applyGoogleTag(html) {
  const clean = html.replace(/<!-- marand:google-tag -->[\s\S]*?<!-- \/marand:google-tag -->\n?/gi, '');
  // Keep the charset declaration first, then install before all other scripts.
  const start = /(<head\b[^>]*>\s*(?:<meta\b[^>]*\bcharset\s*=[^>]*>\s*)?)/i;
  if (!start.test(clean)) throw new Error('Google tag requires a document head');
  return clean.replace(start, (_, head) => `${head}${GOOGLE_TAG}\n`);
}
