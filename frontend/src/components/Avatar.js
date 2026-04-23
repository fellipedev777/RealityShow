export default function Avatar({ src, name, imgClass = 'w-full h-full object-cover' }) {
  if (!src) return <>{name?.[0]?.toUpperCase() || '?'}</>;
  if (!src.startsWith('http')) return <span style={{ fontSize: '1.25em', lineHeight: 1 }}>{src}</span>;
  return <img src={src} alt={name || ''} className={imgClass} />;
}
