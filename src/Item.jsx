import { imageFor, LAYOUTS } from './data.js';

// Shows the PNG/WEBP if one exists in src/images, otherwise the emoji.
export default function Item({ item, className = '', style }) {
  const src = imageFor(item.id);
  return (
    <span className={`item ${className}`} style={style}>
      {src ? (
        <img src={src} alt={item.name} draggable={false} />
      ) : (
        <span role="img" aria-label={item.name}>{item.emoji}</span>
      )}
    </span>
  );
}

// qty copies of one item, arranged and centred in a square that fits the space it is given.
export function ItemGrid({ item, qty }) {
  const { f, c } = LAYOUTS[qty];
  const sz = f * 94; // leave a small gap between copies
  return (
    <div className="arrange">
      {c.map(([x, y], i) => (
        <Item
          key={i}
          item={item}
          className="tile"
          style={{ '--sz': sz, left: `${x * 100 - sz / 2}%`, top: `${y * 100 - sz / 2}%`, width: `${sz}%`, height: `${sz}%` }}
        />
      ))}
    </div>
  );
}
