export const ITEMS = [
  { id: 'onions', name: 'onions', emoji: '🧅' },
  { id: 'mushrooms', name: 'mushrooms', emoji: '🍄' },
  { id: 'green-peppers', name: 'green peppers', emoji: '🫑' },
  { id: 'melons', name: 'melons', emoji: '🍈' },
  { id: 'peaches', name: 'peaches', emoji: '🍑' },
  { id: 'bananas', name: 'bananas', emoji: '🍌' },
  { id: 'tomatoes', name: 'tomatoes', emoji: '🍅' },
  { id: 'cabbages', name: 'cabbages', emoji: '🥬' },
  { id: 'corn', name: 'corn', emoji: '🌽' },
  { id: 'apples', name: 'apples', emoji: '🍎' },
  { id: 'pineapples', name: 'pineapples', emoji: '🍍' },
  { id: 'cherries', name: 'cherries', emoji: '🍒' },
  { id: 'carrots', name: 'carrots', emoji: '🥕' },
  { id: 'cucumbers', name: 'cucumbers', emoji: '🥒' },
  { id: 'potatoes', name: 'potatoes', emoji: '🥔' },
  { id: 'strawberries', name: 'strawberries', emoji: '🍓' },
  { id: 'oranges', name: 'oranges', emoji: '🍊' },
  { id: 'kiwi-fruits', name: 'kiwi fruits', emoji: '🥝' },
];

export const MIN_QTY = 2;
export const MAX_QTY = 9;

// How many copies sit where inside the item card. Coordinates are the centre of each copy,
// as a fraction (0-1) of a square box; f is each copy's size as a fraction of that box.
const G = [1 / 6, 1 / 2, 5 / 6];
const T = 1 / 3;
const row = (y, xs) => xs.map((x) => [x, y]);
const all = G.flatMap((y) => row(y, G));
export const LAYOUTS = {
  2: { f: 0.5, c: [[0.25, 0.5], [0.75, 0.5]] },
  3: { f: 0.5, c: [[0.5, 0.25], [0.25, 0.75], [0.75, 0.75]] },
  4: { f: 0.5, c: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]] },
  5: { f: 0.4, c: [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8], [0.5, 0.5]] },
  6: { f: T, c: [...row(1 / 3, G), ...row(2 / 3, G)] },
  7: { f: T, c: [...row(1 / 6, [1 / 3, 2 / 3]), ...row(1 / 2, G), ...row(5 / 6, [1 / 3, 2 / 3])] },
  8: { f: T, c: all.filter(([x, y]) => !(x === 0.5 && y === 0.5)) },
  9: { f: T, c: all },
};

// Picks up any PNG/WEBP dropped into src/images, named by item id.
const found = import.meta.glob('./images/*.{png,webp}', { eager: true, query: '?url', import: 'default' });
export function imageFor(id) {
  return found[`./images/${id}.webp`] || found[`./images/${id}.png`] || null;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One conversation per player in the chain. No repeated item until all 18 are used.
export function buildRounds(count) {
  const pool = [];
  while (pool.length < count) pool.push(...shuffle(ITEMS));
  return pool.slice(0, count).map((item) => ({
    item,
    qty: MIN_QTY + Math.floor(Math.random() * (MAX_QTY - MIN_QTY + 1)),
  }));
}

export function fmt(ms) {
  const t = Math.floor(ms / 100);
  const m = Math.floor(t / 600);
  const s = Math.floor((t % 600) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${t % 10}`;
}
