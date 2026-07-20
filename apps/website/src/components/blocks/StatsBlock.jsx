import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

function useCountUp(target, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    const num = parseFloat(String(target).replace(/[^0-9.]/g, ''));
    if (isNaN(num)) {
      setValue(target);
      return;
    }
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.floor(num * eased));
      if (progress < 1) requestAnimationFrame(step);
      else setValue(num);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

function StatItem({ stat, primaryColor, isVisible }) {
  const numericValue = parseFloat(String(stat.value).replace(/[^0-9.]/g, ''));
  const isNumeric = !isNaN(numericValue);
  const prefix = isNumeric ? String(stat.value).match(/^[^0-9]*/)?.[0] || '' : '';
  const suffix = isNumeric ? String(stat.value).match(/[^0-9]*$/)?.[0] || '' : '';
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 2000, isVisible);

  return (
    <div className="text-center p-6">
      <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: primaryColor }}>
        {isNumeric ? `${prefix}${animatedValue}${suffix}` : stat.value}
      </div>
      <div className="text-gray-600 font-medium">{stat.label}</div>
      {stat.description && <p className="text-gray-400 text-sm mt-1">{stat.description}</p>}
    </div>
  );
}

export default function StatsBlock({ data, branding }) {
  const { title, subtitle, stats = [], columns = 4 } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div ref={ref}>
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {stats.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista statistici.</p>
      ) : (
        <div className={cn('grid gap-6', gridCols[columns] || gridCols[4])}>
          {stats.map((stat, index) => (
            <StatItem key={index} stat={stat} primaryColor={primaryColor} isVisible={isVisible} />
          ))}
        </div>
      )}
    </div>
  );
}
