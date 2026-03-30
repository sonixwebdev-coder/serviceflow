export default function GridBackground({ className = '' }) {
  return (
    <>
      <div
        className={`absolute inset-0 opacity-[0.03] ${className}`}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
    </>
  );
}
