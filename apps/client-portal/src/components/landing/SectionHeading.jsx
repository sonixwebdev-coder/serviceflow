export default function SectionHeading({ label, title, subtitle, center = false, className = '' }) {
  return (
    <div className={`mb-14 ${center ? 'text-center' : ''} ${className}`}>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">{label}</p>
      )}
      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
      {subtitle && (
        <p
          className={`mt-4 text-base text-gray-500 leading-relaxed ${center ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
