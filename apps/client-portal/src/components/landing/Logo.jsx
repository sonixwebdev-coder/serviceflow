import { runtimeConfig } from '@/config/runtime';

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-extrabold tracking-tight ${className}`}>
      <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7" aria-hidden="true">
        <rect width="28" height="28" rx="8" className="fill-primary" />
        <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span>{runtimeConfig.platformName}</span>
    </span>
  );
}
