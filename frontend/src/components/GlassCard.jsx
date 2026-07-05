export default function GlassCard({ className = '', children }) {
  return <section className={`glass-card ${className}`.trim()}>{children}</section>;
}

