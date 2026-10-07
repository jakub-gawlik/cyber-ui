// demo wiring — imports the library source directly (Vite resolves TS)
import { toast } from '../src/index.ts';

// toast triggers
document.getElementById('toast-info').addEventListener('click', () =>
  toast('Survey of Kerbol III complete.'),
);
document.getElementById('toast-success').addEventListener('click', () =>
  toast('Zero-point energy researched.', { title: 'Research', variant: 'success' }),
);
document.getElementById('toast-danger').addEventListener('click', () =>
  toast('Hull integrity critical.', { title: 'Alert', variant: 'danger', duration: 8000 }),
);

// placeholder "nebula" art, generated so the demo has no binary assets
function nebula(hueA, hueB, seed) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <defs>
      <radialGradient id="a" cx="${30 + seed * 10}%" cy="40%" r="80%">
        <stop offset="0%" stop-color="hsl(${hueA} 90% 60%)"/>
        <stop offset="55%" stop-color="hsl(${hueB} 80% 30%)"/>
        <stop offset="100%" stop-color="#05080f"/>
      </radialGradient>
    </defs>
    <rect width="640" height="360" fill="url(#a)"/>
    ${Array.from({ length: 70 }, (_, i) => {
      const x = (i * 97 + seed * 131) % 640;
      const y = (i * 53 + seed * 17) % 360;
      const r = (i % 3) * 0.6 + 0.4;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="0.8"/>`;
    }).join('')}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
document.getElementById('img-css').src = nebula(190, 230, 1);
document.getElementById('img-wc').src = nebula(300, 260, 2);

// theme switcher — built-in sets from themes.css. One attribute swaps the
// whole token set; CSS classes and shadow-DOM elements retheme together.
document.getElementById('theme-switcher').addEventListener('click', (e) => {
  const theme = e.target.dataset?.theme;
  if (theme) document.documentElement.dataset.cyberTheme = theme;
});

// modal wiring
const modal = document.getElementById('demo-modal');
document.getElementById('open-modal').addEventListener('click', () => modal.show());
modal.addEventListener('cyber-close', () => console.log('modal closed'));
modal.querySelectorAll('[slot="footer"]').forEach((b) =>
  b.addEventListener('click', () => modal.close()),
);
