import { createRequire } from 'node:module';

// Octicons (MIT, GitHub) so the icons match the rest of the profile page.
const require = createRequire(import.meta.url);
const data = require('@primer/octicons/build/data.json') as Record<string, { heights: Record<string, { path: string }> }>;

export type IconName = 'git-commit' | 'git-pull-request' | 'code-review' | 'issue-opened' | 'star' | 'star-fill' | 'mark-github';

/** An octicon at (x, y), scaled to `size`; large sizes use the more detailed 24px drawing. */
export function icon(name: IconName, x: number, y: number, size = 16, cls = 'icon'): string {
  const heights = data[name]?.heights;
  const base = size > 20 && heights?.['24'] ? 24 : 16;
  const path = heights?.[String(base)]?.path;
  if (!path) throw new Error(`unknown octicon ${name}`);
  return `<g class="${cls}" transform="translate(${x} ${y}) scale(${size / base})">${path}</g>`;
}
