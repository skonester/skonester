# Skonester's profile

The root `README.md` is the profile for `skonester/skonester`. It uses the SVG generator already in this repository, with cyan accents and light/dark variants. The checked-in cards in `stats/` work immediately; activity cards explicitly say **First refresh pending** until real data is collected.

## Publish and refresh

1. Commit and push the repository to the `main` branch of the public `skonester/skonester` repository.
2. The **Update profile cards** workflow runs on that push, then daily at 10:17 UTC. It can also be started from **Actions → Update profile cards → Run workflow**.
3. The workflow uses the local [composite action](../action.yml), reads [cool-readme.yml](../cool-readme.yml), and commits updated SVGs to `stats/` on `main` only when they change. These asset-only commits do not trigger another refresh.

Public activity uses the workflow's built-in `GITHUB_TOKEN`, so no extra secret is needed. Unlike the upstream example workflow, this profile stores its cards on `main`, keeping relative image links valid from the first commit.

## Customize

- Edit the introduction and featured project in [README.md](../README.md).
- Edit the about card's headline, lines, and facts under `cards.about` in [cool-readme.yml](../cool-readme.yml). Surround words with asterisks for accent color.
- Change `look.color` to `github`, `amber`, `green`, `purple`, `cyan`, `red`, or `blue`. Change `look.style` to `classic`, `dotmatrix`, or `oled`.
- Set `look.animations: false` for still cards. The default classic cards also respect reduced motion preferences.
- Add `streaks` or `contributions` to `show` to generate those cards, then add their `stats/<card>-light.svg` and `stats/<card>-dark.svg` pictures to the README. Remove both the picture and its `show` entry to hide a card.

The [original generator documentation](generator.md) describes every setting and the separate `cards` branch approach. Its screenshots and example settings belong to the upstream author; this profile does not use them as personal data.

## Preview locally

Use Node.js 24 LTS and install dependencies from the repository root:

```powershell
npm ci
npm run profile:preview
Start-Process out/profile-preview.html
```

This renders the about card, creates pending cards only where no activity card exists, and shows both themes. It leaves existing activity cards intact and makes no API calls. It supports the profile's default classic cards with a transparent background.

For real activity, set `GITHUB_TOKEN` or `GH_TOKEN` in your environment and run:

```powershell
npm run generate -- --config cool-readme.yml --out stats
npm run profile:preview
```

For dot matrix, OLED, or a fixed background, use `npm run generate -- --config cool-readme.yml --out out --preview` and open `out/preview.html` instead of the offline preview.

Do not commit tokens or raw snapshots. If you use `--snapshot` for offline development, store it under the gitignored `.cache/` directory.

## Include private activity (optional)

Public activity is the default. To include private work, create a classic personal access token with the upstream generator's `repo`, `read:org`, and `read:user` scopes and save it as the repository Actions secret `CARDS_TOKEN`. Set `count.private: true` in `cool-readme.yml` and rerun the workflow. The workflow automatically prefers that secret when present. Authorize it for SSO organizations if needed.

Only aggregate totals and language shares are rendered for private repositories; their names are not shown. Private activity will become visible through those totals, so enable it only if you want that information on your public profile.

## Validation

```powershell
npm test
npm run typecheck
```

The original generator and its MIT attribution remain in [LICENSE](../LICENSE).
