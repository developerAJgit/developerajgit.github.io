# developerajgit.github.io

Portfolio of **Ajay Kumar Gannamaneni**, Microsoft MVP (Power Apps) and Power Platform Architect.
Served by GitHub Pages at https://developerajgit.github.io.

The site is hand-built static HTML, CSS and JavaScript, with no framework and no build step.

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `assets/styles.css` | Design tokens for the four themes (Midnight, Ember, Jade, Sakura), glass and glow effects, layout |
| `assets/main.js` | Navigation, reveal-on-scroll, article list, MVP figures |
| `assets/fx.js` | Theme switcher, sky particles, cursor spotlight, card tilt, counters, featured article covers |
| `brand.html`, `assets/brand.css`, `assets/brand.js` | Live UI brand kit: themes, colour, type, effects, components, motion, rules, tokens |
| `assets/img/covers/` | Article cover art used in the Writing section |
| `assets/architecture.js` | Interactive reference architecture |
| `assets/articles.js` | Index of LinkedIn articles (title, date, URL, topic) |
| `assets/data/mvp.json` | MVP figures shown on the page (see below) |
| `assets/powerfx.js` | A small Power Fx interpreter used by the Canvas Apps playground |
| `assets/playground/` | One module per playground tab: `architect`, `flow`, `canvas`, `codeapps`, `agent`, `sharepoint`, `dataverse`, `apis`, `alm`. `core.js` holds shared helpers and `boot.js` builds the tabs |
| `assets/playground.css` | Playground styles |

To add a playground tab, create a module that calls `PG.register({ id, order, group, short, name, color, icon, init })`, then include it before `boot.js` in `index.html`.

## Updating the MVP count

Every place that shows the number of Power Apps MVPs in India reads `assets/data/mvp.json`. The browser fetches it on each visit, so a change to that file goes live on the next page load:

```json
{ "powerAppsMvpsInIndia": 11, "asOf": "2025-12-01" }
```

## Run locally

Open `index.html` directly, or serve the folder (for example `python3 -m http.server`) so `mvp.json` is fetched the same way it is in production.
