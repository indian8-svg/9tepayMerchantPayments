import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  variant?: 'light' | 'dark' | 'auto';
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  variant = 'auto',
  iconOnly = false,
}) => {
  // Dimensions scaling based on size
  const sizes = {
    sm: { icon: 'w-7 h-7', title: 'text-base', subtitle: 'text-[9px]' },
    md: { icon: 'w-9 h-9', title: 'text-xl', subtitle: 'text-[10px]' },
    lg: { icon: 'w-12 h-12', title: 'text-2xl', subtitle: 'text-[11px]' },
    xl: { icon: 'w-16 h-16', title: 'text-3xl', subtitle: 'text-xs' },
  };

  const currentSize = sizes[size] || sizes.md;

  // Variant color mapping
  const textColorClass =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white';

  const subtitleColorClass =
    variant === 'dark'
      ? 'text-slate-400'
      : variant === 'light'
      ? 'text-slate-500'
      : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Iconic 9tepay Emblem SVG matching uploaded brand image */}
      <div className={`relative shrink-0 ${currentSize.icon}`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="ninePayGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="40%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="ninePayGrad2" x1="20%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Outer '9' Ribbon Loop */}
          <path
            d="M 52,18 C 34,18 20,32 20,50 C 20,68 34,82 52,82 C 65,82 76,74 80,62 L 67,58 C 64,65 58,70 52,70 C 41,70 32,61 32,50 C 32,39 41,30 52,30 C 61,30 68,36 71,44 L 83,38 C 77,26 66,18 52,18 Z"
            fill="url(#ninePayGrad1)"
            filter="url(#glow)"
          />

          {/* Upward Growth Arrow breaking through the loop */}
          <path
            d="M 38,68 L 78,28 L 65,28 L 78,28 L 78,41"
            stroke="url(#ninePayGrad2)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Stem Tail */}
          <path
            d="M 36,58 C 30,68 24,78 20,86 L 31,86 C 35,78 40,70 45,60 Z"
            fill="url(#ninePayGrad1)"
          />
        </svg>
      </div>

      {/* Brand Text Block */}
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline">
            <span
              className={`font-black tracking-tight ${currentSize.title} ${textColorClass}`}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              9tepay
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`font-semibold tracking-wide uppercase mt-0.5 ${currentSize.subtitle} ${subtitleColorClass}`}
            >
              Securing Digital Payments
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
