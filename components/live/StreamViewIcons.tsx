type StreamViewIconProps = {
  className?: string;
};

export function ExpandVideoIcon({ className }: StreamViewIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />
    </svg>
  );
}

export function CollapseVideoIcon({ className }: StreamViewIconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4v3a2 2 0 0 1-2 2H4m16 0h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3m11-5h-3a2 2 0 0 0-2 2v3" />
    </svg>
  );
}