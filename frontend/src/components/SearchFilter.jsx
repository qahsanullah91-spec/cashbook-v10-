export default function SearchFilter({ value, onChange, placeholder = 'Search' }) {
  return <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

