// Date du jour, état d'ouverture, plan de salle, formulaire
const TZ = 'Europe/Paris';
const HOURS = { 0: [[12, 15]], 1: [], 2: [[12, 14], [19, 22]], 3: [[12, 14], [19, 22]], 4: [[12, 14], [19, 22]], 5: [[12, 14], [19, 22]], 6: [[12, 14.5], [19, 23]] };
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const hm = (h) => { const m = Math.round((h % 1) * 60); return Math.floor(h) + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); };

function parisNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { day, h: (+p.hour % 24) + +p.minute / 60 };
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

function today() {
  const el = document.getElementById('today');
  const now = new Date();
  const d = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  el.textContent = `${d}, ${parisNow().h < 16 ? 'midi' : 'soir'}`;
  const input = document.getElementById('date');
  if (input) input.min = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

// Plan de salle : 7 tables, 20 couverts
const TABLES = [
  { n: 1, c: 2, x: 40, y: 100 }, { n: 2, c: 2, x: 40, y: 170 }, { n: 3, c: 2, x: 40, y: 240 },
  { n: 4, c: 4, x: 170, y: 120 }, { n: 5, c: 4, x: 290, y: 120 }, { n: 6, c: 4, x: 170, y: 230 }, { n: 7, c: 4, x: 290, y: 230 },
];
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

function plan() {
  const svg = document.getElementById('plan');
  if (!svg) return;
  mk('rect', { class: 'wall', x: 6, y: 6, width: 468, height: 328 }, svg);
  mk('rect', { class: 'zone', x: 380, y: 6, width: 94, height: 200 }, svg);
  mk('text', { class: 'lbl', x: 427, y: 100, 'text-anchor': 'middle' }, svg).textContent = 'Bar';
  mk('rect', { class: 'zone', x: 6, y: 6, width: 374, height: 52 }, svg);
  mk('text', { class: 'lbl', x: 193, y: 37, 'text-anchor': 'middle' }, svg).textContent = 'Four à bois et cuisine ouverte';
  mk('rect', { x: 380, y: 328, width: 94, height: 12, fill: '#f7f7f4' }, svg);
  mk('text', { class: 'lbl', x: 427, y: 290, 'text-anchor': 'middle' }, svg).textContent = 'Entrée';
  mk('path', { d: 'M388 334v-30a40 40 0 0 1 40 0', fill: 'none', stroke: '#13161f', 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
  const form = document.getElementById('resa'), chosen = document.getElementById('chosen');
  let sel = null;
  const groups = TABLES.map((t) => {
    const w = t.c === 2 ? 58 : 84, h = 46;
    const g = mk('g', { class: 'tbl', role: 'button', tabindex: 0, 'aria-pressed': 'false', 'aria-label': `Table ${t.n}, ${t.c} couverts` }, svg);
    const seats = t.c === 2 ? [[w / 2 - 7, -9], [w / 2 - 7, h]] : [[w / 4 - 7, -9], [(3 * w) / 4 - 7, -9], [w / 4 - 7, h], [(3 * w) / 4 - 7, h]];
    seats.forEach(([sx, sy]) => mk('rect', { class: 'ch', x: t.x + sx, y: t.y + sy, width: 14, height: 7, rx: 2 }, g));
    mk('rect', { class: 't', x: t.x, y: t.y, width: w, height: h, rx: 3 }, g);
    mk('text', { x: t.x + w / 2, y: t.y + h / 2 - 5 }, g).textContent = t.n;
    mk('text', { class: 'cov', x: t.x + w / 2, y: t.y + h / 2 + 11 }, g).textContent = `${t.c} pers.`;
    const pick = () => {
      sel = sel === t ? null : t;
      groups.forEach((o) => o.setAttribute('aria-pressed', String(sel && o.dataset.n === String(sel.n))));
      chosen.textContent = sel ? `Table ${sel.n}, ${sel.c} couverts.` : 'Aucune table choisie : on vous en proposera une.';
      chosen.classList.toggle('on', !!sel);
      form.dataset.table = sel ? `Table ${sel.n} (${sel.c} couverts)` : '';
    };
    g.dataset.n = t.n;
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

status(); today(); plan(); resa();
