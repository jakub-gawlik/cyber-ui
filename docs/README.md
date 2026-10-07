# cyber-ui documentation

[Cyberpunk](https://www.cyberpunk.net) and
[Stellaris](https://www.paradoxinteractive.com/games/stellaris/about) games were
direct inspiration behind this project.

Framework-agnostic UI components: a zero-JS CSS core plus Lit web components.

| Guide                                 | Contents                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| [Getting started](getting-started.md) | Install (npm / CDN), imports, framework notes (React, Vue), browser support     |
| [Theming](theming.md)                 | Design tokens, built-in themes, composing your own theme, fonts                 |
| [CSS components](css-components.md)   | Every `.cyber-*` class: markup, modifiers, accessibility notes                  |
| [Web components](web-components.md)   | Every `<cyber-*>` element: attributes, slots, events, parts, methods, `toast()` |
| [Effects](effects.md)                 | `.cyber-fx-*` decorative classes and the interaction model                      |
| [Architecture](architecture.md)       | Repo layout, dual-consumption CSS, build pipeline, demo, smoke tests, CI        |

Quick links into the source of truth:

- Tokens: [`src/styles/tokens.css`](../src/styles/tokens.css)
- Built-in themes: [`src/styles/themes.css`](../src/styles/themes.css)
- Component styles: [`src/styles/components/`](../src/styles/components/)
- Elements: [`src/components/`](../src/components/)
- Demo: [`demo/`](../demo/) — `npm run dev` locally; `npm run build:demo`
  produces the static site for the dedicated demo website
