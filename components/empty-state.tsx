// A friendly sitting-dog illustration for empty states.
function DogArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} fill="none" stroke="currentColor" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* sitting body */}
      <path d="M54 150 C44 126 44 104 62 96 C78 89 98 92 106 106 C114 120 116 136 110 150" />
      {/* front legs */}
      <path d="M70 150 L70 122" />
      <path d="M96 150 L96 122" />
      {/* head */}
      <path d="M52 60 C52 40 70 30 82 30 C94 30 112 40 112 60 C112 80 98 96 82 96 C66 96 52 80 52 60 Z" />
      {/* floppy ears */}
      <path d="M56 46 C42 42 40 76 58 82" />
      <path d="M108 46 C122 42 124 76 106 82" />
      {/* eyes + nose */}
      <circle cx="72" cy="58" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="92" cy="58" r="3.2" fill="currentColor" stroke="none" />
      <ellipse cx="82" cy="74" rx="6" ry="4.5" fill="currentColor" stroke="none" />
      {/* mouth */}
      <path d="M82 78 C82 86 74 88 70 83" />
      <path d="M82 78 C82 86 90 88 94 83" />
      {/* tail */}
      <path d="M110 138 C128 136 130 116 118 112" />
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="mt-8 flex flex-col items-center text-center py-6">
      <DogArt className="h-24 w-24 text-muted/70" />
      <p className="mt-3 text-espresso font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-muted max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
