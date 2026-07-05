export default function PrintHeader({ company, title }) {
  return (
    <div className="print-header">
      <h1>{company}</h1>
      <h2>{title}</h2>
    </div>
  );
}

