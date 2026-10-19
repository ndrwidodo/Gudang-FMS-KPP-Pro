import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const PatraJasaLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', text1: 'text-sm', text2: 'text-[9px]' },
    md: { box: 'w-10 h-10', text1: 'text-base', text2: 'text-[11px]' },
    lg: { box: 'w-14 h-14', text1: 'text-xl', text2: 'text-xs' },
    xl: { box: 'w-20 h-20', text1: 'text-3xl', text2: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Icon Squircle Badge */}
      <div
        className={`${currentSize.box} rounded-xl bg-white shadow-sm border border-slate-200/80 p-1 flex items-center justify-center relative overflow-hidden flex-shrink-0`}
      >
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle curved background grid */}
          <rect width="160" height="160" rx="32" fill="#FFFFFF" />

          {/* PATRA text */}
          <text
            x="14"
            y="76"
            fontFamily="'Calibri', 'Segoe UI', Arial, sans-serif"
            fontWeight="900"
            fontSize="32"
            letterSpacing="-0.5"
            fill="#0A4D94"
          >
            PATRA
          </text>

          {/* JASA text */}
          <text
            x="96"
            y="76"
            fontFamily="'Calibri', 'Segoe UI', Arial, sans-serif"
            fontWeight="900"
            fontSize="32"
            letterSpacing="-0.5"
            fill="#32A028"
          >
            JASA
          </text>

          {/* Red Smile Curve under 'RA' */}
          <path
            d="M 68 82 Q 88 100 108 82 Q 88 92 68 82 Z"
            fill="#DE1B23"
          />

          {/* FMS Apps Subtitle */}
          <text
            x="80"
            y="126"
            textAnchor="middle"
            fontFamily="'Calibri', 'Segoe UI', Arial, sans-serif"
            fontWeight="700"
            fontSize="26"
            fill="#0974E6"
          >
            FMS Apps
          </text>
        </svg>
      </div>

      {showSubtitle && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1 font-bold tracking-tight text-slate-800">
            <span className="text-[#0A4D94]">PATRA</span>
            <span className="text-[#32A028]">JASA</span>
            <span className="text-xs bg-[#714B67] text-white px-1.5 py-0.5 rounded ml-1 font-semibold uppercase tracking-wider">
              KPP
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium tracking-wide">
            Inventory Gudang KPP
          </span>
        </div>
      )}
    </div>
  );
};
