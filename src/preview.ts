import { CARDS } from './config.ts';

// A local page showing the cards the way setup.sh lays them out in a profile README (two cards per
// row in the usual order, in a column as wide as GitHub's), on GitHub's light and dark backgrounds.
export function previewHtml(files: string[], widths: Record<string, number>): string {
  const cards = CARDS.filter((card) => files.includes(`${card}-light.svg`));
  const rows: string[][] = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));
  const picture = (mode: 'light' | 'dark', card: string) => `<img src="${card}-${mode}.svg" width="${widths[card]}" alt="${card}">`;
  const readme = (mode: 'light' | 'dark') => `
<section class="${mode}"><div class="readme">
${rows.map((row) => `<p align="center">${row.map((card) => picture(mode, card)).join('\n')}</p>`).join('\n')}
</div></section>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card preview</title>
<style>
  body { margin: 0; }
  section { padding: 24px 16px; }
  .readme { max-width: 830px; margin: 0 auto; }
  img { max-width: 100%; } /* as in GitHub's README styles */
  .light { background: #ffffff; }
  .dark { background: #0d1117; }
</style>
</head>
<body>
${readme('light')}
${readme('dark')}
<script>
  // Press r to reload the images, so the animations play again.
  addEventListener('keydown', (e) => {
    if (e.key === 'r') document.querySelectorAll('img').forEach((i) => (i.src = i.src.split('?')[0] + '?' + Date.now()));
  });
</script>
</body>
</html>
`;
}
