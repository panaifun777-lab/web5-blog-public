// Single rendering rule for demo rows. Consumers pass the flag from the API
// payload (`isDemo`); no component keeps its own demo list.
export function DemoBadge({
  isDemo,
  className = '',
}: {
  isDemo?: boolean | null;
  className?: string;
}) {
  if (!isDemo) return null;
  return (
    <span
      title="演示数据，不计入统计与收益"
      className={`inline-flex items-center rounded border border-[#FFCC00]/30 bg-[#FFCC00]/20 px-1 text-[9px] font-bold font-mono text-[#FFCC00] ${className}`}
    >
      演示
    </span>
  );
}
