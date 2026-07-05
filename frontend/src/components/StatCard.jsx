import GlassCard from './GlassCard';

export default function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <GlassCard className={`stat-card tone-${tone}`}>
      <p>{label}</p>
      <h3>{value}</h3>
    </GlassCard>
  );
}

