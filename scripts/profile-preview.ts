// Preview the profile without a token. Existing activity cards are left intact.
// Pending cards explicitly avoid using the upstream author's sample statistics.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../src/config.ts';
import { previewHtml } from '../src/preview.ts';
import { renderAbout } from '../src/render/about.ts';
import { cardWidths } from '../src/render/index.ts';
import { CARD_HEIGHT, PAD, WIDTH, card, esc, headerText, themeFor } from '../src/render/svg.ts';

const config = loadConfig('cool-readme.yml');
const output = 'stats';
const titles = {
  summary: 'GitHub activity',
  languages: 'Languages in my contributions',
  weekly: 'When I code',
  streaks: 'Streaks',
  contributions: 'Notable contributions',
};

// This offline preview uses the profile's default classic, transparent appearance.
// Use the generator with a token to preview other styles and backgrounds.
if (config.look.style !== 'classic' || config.look.background !== 'none') {
  throw new Error('Offline profile preview expects classic cards with background: none. Use npm run generate for other looks.');
}

mkdirSync(output, { recursive: true });
const files: string[] = [];
for (const mode of ['light', 'dark'] as const) {
  const theme = themeFor(mode, config.look.color);
  for (const name of config.show) {
    const file = `${name}-${mode}.svg`;
    const destination = join(output, file);
    files.push(file);
    if (name === 'about') {
      writeFileSync(destination, renderAbout(theme, config));
    } else if (!existsSync(destination)) {
      const title = config.cards[name].title ?? titles[name];
      writeFileSync(destination, card({
        width: WIDTH,
        height: CARD_HEIGHT,
        title,
        desc: 'Awaiting the first GitHub Actions refresh. No activity data has been loaded yet.',
        theme,
        config,
        body: `${headerText(title, PAD)}
<circle cx="${PAD + 5}" cy="78" r="4" fill="${theme.accent}"/>
<text x="${PAD + 20}" y="83" class="value">First refresh pending</text>
<text x="${PAD}" y="113" class="label secondary">Public GitHub activity will appear here</text>
<text x="${PAD}" y="135" class="label secondary">after the profile workflow runs.</text>
<text x="${PAD}" y="170" class="small muted">${esc(config.user ?? 'GitHub')} / updated daily</text>`,
      }));
    }
  }
}

mkdirSync('out', { recursive: true });
const preview = previewHtml(files, cardWidths(config)).replaceAll('src="', 'src="../stats/');
writeFileSync('out/profile-preview.html', preview);
console.log('Profile cards ready in stats/. Open out/profile-preview.html to see both themes.');
