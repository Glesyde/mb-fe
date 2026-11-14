import React from 'react';

/**
 * MedBookie wordmark ("MedBookie | Health Information Software"), drawn as text
 * so it never depends on an image file and stays sharp at any size.
 *
 * - variant "onLight": orange + charcoal, for white backgrounds (login page).
 * - variant "onDark":  white, for coloured or dark bars (app header / sidebar).
 * - compact: only the "MB" mark, for the collapsed sidebar or small screens.
 * - showTagline: the "Health Information Software" part next to the name.
 */
interface MedBookieLogoProps {
  variant?: 'onLight' | 'onDark';
  compact?: boolean;
  showTagline?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}

const MedBookieLogo: React.FC<MedBookieLogoProps> = ({
  variant = 'onLight',
  compact = false,
  showTagline = true,
  size = 'lg',
  className = '',
}) => {
  const t = (text: string) => text;
  const onDark = variant === 'onDark';
  const medColor = onDark ? 'text-white' : 'text-brand-primary';
  const bookieColor = onDark ? 'text-white/90' : 'text-brand-dark';

  if (compact) {
    return (
      <div
        aria-label="MedBookie"
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-extrabold text-sm tracking-tight select-none ${
          onDark ? 'bg-white/15 text-white border border-white/25' : 'bg-brand-primary text-white'
        } ${className}`}
      >
        MB
      </div>
    );
  }

  const nameSize = size === 'lg' ? 'text-2xl sm:text-[28px]' : 'text-xl';

  return (
    <div dir="ltr" aria-label="MedBookie" className={`inline-flex items-center select-none ${className}`}>
      <div className={`${nameSize} font-extrabold tracking-tight leading-none whitespace-nowrap`}>
        <span className={medColor}>Med</span>
        <span className={bookieColor}>Bookie</span>
      </div>
      {showTagline && (
        <>
          <div className={`mx-3 h-7 w-[1.5px] ${onDark ? 'bg-white/30' : 'bg-slate-200'}`} />
          <div className="flex flex-col justify-center text-start leading-none">
            <span className={`${onDark ? 'text-white' : 'text-brand-primary'} font-bold text-xs tracking-tight`}>
              {t('Health Information')}
            </span>
            <span className={`${onDark ? 'text-white/70' : 'text-slate-500'} font-normal text-[11px] tracking-tight mt-[1px]`}>
              {t('Software')}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default MedBookieLogo;
