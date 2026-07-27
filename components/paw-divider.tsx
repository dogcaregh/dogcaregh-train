// A little walking paw-trail — a bold, on-theme section separator.
function Paw({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 80 80" className={`fill-gold ${className ?? ""}`} aria-hidden="true">
      <ellipse cx="40" cy="52" rx="14" ry="12" />
      <ellipse cx="23" cy="33" rx="6" ry="8.5" />
      <ellipse cx="33" cy="24" rx="6" ry="9" />
      <ellipse cx="47" cy="24" rx="6" ry="9" />
      <ellipse cx="57" cy="33" rx="6" ry="8.5" />
    </svg>
  );
}

export function PawDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <Paw className="opacity-30 -rotate-12" />
      <Paw className="opacity-60 -translate-y-1.5" />
      <Paw className="opacity-30 rotate-12" />
    </div>
  );
}
