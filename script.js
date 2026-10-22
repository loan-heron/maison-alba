// Date et ouverture, titre et photos animés, défilement de la journée, carte des producteurs, plan de salle, formulaire
const TZ = 'Europe/Paris';
const HOURS = { 0: [[12, 15]], 1: [], 2: [[12, 14], [19, 22]], 3: [[12, 14], [19, 22]], 4: [[12, 14], [19, 22]], 5: [[12, 14], [19, 22]], 6: [[12, 14.5], [19, 23]] };
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !still) document.documentElement.classList.add('js-anim');
const hm = (h) => { const m = Math.round((h % 1) * 60); return Math.floor(h) + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };

function parisNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), h: (+p.hour % 24) + +p.minute / 60 };
}

function status() {
  const el = document.getElementById('status');
  const { day, h } = parisNow();
  const slot = HOURS[day].find(([a, b]) => h >= a && h < b);
  if (slot) { el.textContent = `Ouvert, service jusqu’à ${hm(slot[1])}`; el.classList.add('open'); return; }
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const next = HOURS[d].find(([a]) => i > 0 || a > h);
    if (next) { el.textContent = `Fermé, réouverture ${i === 0 ? 'aujourd’hui' : i === 1 ? 'demain' : DAYS[d]} à ${hm(next[0])}`; return; }
  }
}

function minDate() {
  const input = document.getElementById('date');
  if (input) input.min = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

// Titre : chaque mot monte de sous sa ligne
function title() {
  const h = document.querySelector('.hero h1');
  if (!h || still) return;
  let i = 0;
  h.innerHTML = h.textContent.split(' ').map((w) => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(' ');
}

// Photos du hero : parallaxe à la souris et au défilement
function collage() {
  const c = document.getElementById('collage');
  if (!c || still) return;
  if (matchMedia('(hover: hover)').matches) addEventListener('pointermove', (e) => {
    c.style.setProperty('--mx', ((e.clientX / innerWidth) - 0.5).toFixed(3));
    c.style.setProperty('--my', ((e.clientY / innerHeight) - 0.5).toFixed(3));
  }, { passive: true });
  onFrame(() => c.style.setProperty('--sy', Math.min(scrollY / innerHeight, 1.2).toFixed(3)));
}

// Une seule boucle de rendu pour tout ce qui suit le défilement
const frames = [];
let ticking = false;
function onFrame(fn) { frames.push(fn); fn(); }
function tick() { if (ticking) return; ticking = true; requestAnimationFrame(() => { frames.forEach((f) => f()); ticking = false; }); }
addEventListener('scroll', tick, { passive: true });
addEventListener('resize', tick);

// Bandeau de salle : la photo défile plus lentement que la page
function band() {
  const img = document.querySelector('[data-par]');
  if (!img || still) return;
  const box = img.parentElement;
  onFrame(() => {
    const r = box.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height);
    img.style.setProperty('--p', (p * r.height * -0.22).toFixed(1) + 'px');
  });
}

// Une journée : sur grand écran, la section s'épingle et défile à l'horizontale
function journey() {
  const sec = document.getElementById('jour'), track = document.getElementById('track'), bar = document.getElementById('bar');
  if (!sec) return;
  const wide = matchMedia('(min-width: 901px)');
  let max = 0;
  const layout = () => {
    const on = wide.matches && !still;
    sec.classList.toggle('pinned', on);
    track.style.removeProperty('--tx');
    // Course horizontale : jusqu'à ce que la dernière photo garde la même marge que la première
    max = on ? Math.max(track.lastElementChild.getBoundingClientRect().right + parseFloat(getComputedStyle(track).paddingLeft) - innerWidth, 0) : 0;
    sec.style.height = on ? (max + innerHeight * 1.15) + 'px' : '';
    tick();
  };
  onFrame(() => {
    if (sec.classList.contains('pinned')) {
      const dist = sec.offsetHeight - innerHeight;
      const p = Math.min(Math.max((scrollY - sec.offsetTop) / dist, 0), 1);
      track.style.setProperty('--tx', (-p * max).toFixed(1) + 'px');
      bar.style.setProperty('--prog', p.toFixed(3));
    } else {
      const m = track.scrollWidth - track.clientWidth;
      bar.style.setProperty('--prog', m > 0 ? (track.scrollLeft / m).toFixed(3) : 1);
    }
  });
  track.addEventListener('scroll', tick, { passive: true });
  wide.addEventListener('change', layout);
  addEventListener('resize', layout);
  addEventListener('load', layout);
  layout();
}

// Apparitions au défilement : photos qui se dévoilent, textes qui montent
function reveals() {
  const els = document.querySelectorAll('.rv, .rv-t, .step');
  if (!document.documentElement.classList.contains('js-anim')) return;
  document.querySelectorAll('.step').forEach((s, i) => s.style.setProperty('--sd', (i * 0.12) + 's'));
  // Une photo masquée n'a pas de surface visible : on observe donc son parent
  const map = new Map();
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { map.get(e.target).forEach((el) => el.classList.add('in')); io.unobserve(e.target); } }), { threshold: 0.2 });
  els.forEach((el) => { const t = el.classList.contains('rv') ? el.parentElement : el; map.set(t, [...(map.get(t) || []), el]); io.observe(t); });
}

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

// Producteurs à l'échelle : rayon = 40 + 4,9 px par km
const PRODUCERS = [
  { name: 'Poissonnerie Garnier', what: 'cabillaud, poissons du jour', km: 3, a: 235, c: '#f6ebdd', tc: '#1a1a16' },
  { name: 'Fromagerie Duval', what: 'comté, fromages affinés', km: 4, a: 55, c: '#ebc95b', tc: '#1a1a16' },
  { name: 'Moulin de Vaugneray', what: 'farine de blé', km: 24, a: 150, c: '#14392f' },
  { name: 'Jardins de l’Azergues', what: 'légumes, herbes, courges', km: 31, a: 20, c: '#2f6b52' },
  { name: 'Ferme des Collonges', what: 'œufs, volailles', km: 38, a: 300, c: '#5a2c4f' },
  { name: 'Vergers Perrin', what: 'poires, pommes', km: 47, a: 100, c: '#b8351b' },
];
const R = (km) => 40 + km * 4.9;

function radar() {
  const svg = document.getElementById('radar'), legend = document.getElementById('legend');
  if (!svg) return;
  [10, 25, 50].forEach((km, i) => {
    mk('circle', { class: 'ring r' + i, cx: 0, cy: 0, r: R(km), pathLength: 1 }, svg);
    mk('text', { class: 'rl', x: 0, y: -R(km) - 7 }, svg).textContent = km + ' km';
  });
  mk('circle', { class: 'rad-halo', cx: 0, cy: 0, r: 9 }, svg);
  const home = mk('circle', { class: 'rad-home', cx: 0, cy: 0, r: 9 }, svg);
  mk('title', {}, home).textContent = 'Maison Alba, 14 rue des Tanneurs';
  PRODUCERS.forEach((p, i) => {
    const rad = (p.a - 90) * Math.PI / 180, r = R(p.km), x = r * Math.cos(rad), y = r * Math.sin(rad);
    const d = (0.9 + i * 0.12).toFixed(2) + 's';
    mk('line', { class: 'ln', x1: 0, y1: 0, x2: x, y2: y, style: `--d:${d}` }, svg);
    const g = mk('g', { class: 'dot', style: `--c:${p.c};--tc:${p.tc || '#fff'};--d:${d}` }, svg);
    const gg = mk('g', {}, g);
    mk('circle', { cx: x, cy: y, r: 17 }, gg);
    mk('text', { x, y: y + 1 }, gg).textContent = i + 1;
    const li = document.createElement('li');
    li.innerHTML = `<span class="n" style="--c:${p.c};--tc:${p.tc || '#fff'}">${i + 1}</span><b>${p.name}</b><span>${p.what}, ${p.km} km</span>`;
    legend.appendChild(li);
  });
  const fig = svg.parentElement;
  if (!document.documentElement.classList.contains('js-anim')) { fig.classList.add('in'); return; }
  new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { fig.classList.add('in'); ob.disconnect(); } }, { threshold: 0.3 }).observe(fig);
}

// Plan de salle : 7 tables, 20 couverts
const TABLES = [
  { n: 1, c: 2, x: 40, y: 100 }, { n: 2, c: 2, x: 40, y: 170 }, { n: 3, c: 2, x: 40, y: 240 },
  { n: 4, c: 4, x: 170, y: 120 }, { n: 5, c: 4, x: 290, y: 120 }, { n: 6, c: 4, x: 170, y: 230 }, { n: 7, c: 4, x: 290, y: 230 },
];

function plan() {
  const svg = document.getElementById('plan');
  if (!svg) return;
  mk('rect', { class: 'floor', x: 6, y: 6, width: 468, height: 328, rx: 22 }, svg);
  mk('rect', { class: 'zone', x: 380, y: 6, width: 94, height: 190, rx: 0 }, svg);
  mk('text', { class: 'lbl', x: 427, y: 106 }, svg).textContent = 'Bar';
  mk('rect', { class: 'zone k', x: 6, y: 6, width: 374, height: 54 }, svg);
  mk('text', { class: 'lbl', x: 193, y: 38 }, svg).textContent = 'Four à bois et cuisine ouverte';
  mk('rect', { class: 'wall', x: 6, y: 6, width: 468, height: 328, rx: 22 }, svg);
  mk('text', { class: 'lbl', x: 427, y: 292, style: 'fill:#14392f' }, svg).textContent = 'Entrée';
  const form = document.getElementById('resa'), chosen = document.getElementById('chosen');
  let sel = null;
  const groups = TABLES.map((t) => {
    const w = t.c === 2 ? 58 : 84, h = 46;
    const g = mk('g', { class: 'tbl', role: 'button', tabindex: 0, 'aria-pressed': 'false', 'aria-label': `Table ${t.n}, ${t.c} couverts` }, svg);
    const seats = t.c === 2 ? [[w / 2 - 8, -9], [w / 2 - 8, h + 1]] : [[w / 4 - 8, -9], [(3 * w) / 4 - 8, -9], [w / 4 - 8, h + 1], [(3 * w) / 4 - 8, h + 1]];
    seats.forEach(([sx, sy]) => mk('rect', { class: 'ch', x: t.x + sx, y: t.y + sy, width: 16, height: 8, rx: 4 }, g));
    mk('rect', { class: 't', x: t.x, y: t.y, width: w, height: h, rx: 12 }, g);
    mk('text', { x: t.x + w / 2, y: t.y + h / 2 - 5 }, g).textContent = t.n;
    mk('text', { class: 'cov', x: t.x + w / 2, y: t.y + h / 2 + 12 }, g).textContent = `${t.c} pers.`;
    g.dataset.n = t.n;
    const pick = () => {
      sel = sel === t ? null : t;
      groups.forEach((o) => o.setAttribute('aria-pressed', String(!!sel && o.dataset.n === String(sel.n))));
      chosen.textContent = sel ? `Table ${sel.n}, ${sel.c} couverts.` : 'Aucune table choisie : on vous en proposera une.';
      chosen.classList.toggle('on', !!sel);
    };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    return g;
  });
}

function resa() {
  const form = document.getElementById('resa');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    let ok = form.querySelector('.sent');
    if (!ok) { ok = document.createElement('p'); ok.className = 'sent'; ok.setAttribute('role', 'status'); form.appendChild(ok); }
    ok.textContent = `Merci ${d.get('nom')}. C’est un site de démonstration : aucune demande n’est envoyée.`;
  });
}

status(); minDate(); title(); collage(); band(); journey(); reveals(); radar(); plan(); resa();
