import { X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

const initialEmployee = (name) => ({
  full_name: name || '',
  father_name: '',
  phone: '',
  position: '',
  department: '',
  joining_date: new Date().toISOString().slice(0, 10),
  monthly_salary: '',
  currency: 'AFN',
  status: 'active',
  notes: ''
});

function QuickAddField({ label, children, className = '' }) {
  return (
    <label className={`quick-add-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function QuickAddEmployeeModal({ initialName, onClose, onSave }) {
  const [form, setForm] = useState(() => initialEmployee(initialName));
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, monthly_salary: Number(form.monthly_salary || 0) });
    } finally {
      setSaving(false);
    }
  }

  return createPortal((
    <div className="employee-quick-add-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="employee-quick-add-modal glass-card" role="dialog" aria-modal="true" aria-labelledby="quick-add-employee-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><p className="eyebrow">Cash Book Quick Add</p><h3 id="quick-add-employee-title">Add New Employee</h3></div>
          <button type="button" className="icon-btn" aria-label="Close employee form" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="quick-add-employee-grid" onSubmit={submit}>
          <QuickAddField label="Employee Name">
            <input autoFocus value={form.full_name} onChange={(event) => update('full_name', event.target.value)} placeholder="Enter employee name" required />
          </QuickAddField>
          <QuickAddField label="Father Name">
            <input value={form.father_name} onChange={(event) => update('father_name', event.target.value)} placeholder="Enter father name" />
          </QuickAddField>
          <QuickAddField label="Phone Number">
            <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="Enter phone number" />
          </QuickAddField>
          <QuickAddField label="Position / Job Title">
            <input value={form.position} onChange={(event) => update('position', event.target.value)} placeholder="e.g. Operator" required />
          </QuickAddField>
          <QuickAddField label="Department">
            <input value={form.department} onChange={(event) => update('department', event.target.value)} placeholder="e.g. Production" />
          </QuickAddField>
          <QuickAddField label="Joining Date">
            <input type="date" value={form.joining_date} onChange={(event) => update('joining_date', event.target.value)} required />
          </QuickAddField>
          <QuickAddField label="Monthly Salary" className="quick-add-salary-field">
            <span className="quick-add-salary-control">
              <input type="number" min="0" step="0.01" value={form.monthly_salary} onChange={(event) => update('monthly_salary', event.target.value)} placeholder="0.00" required />
              <select value={form.currency} onChange={(event) => update('currency', event.target.value)}><option value="AFN">AFN</option><option value="USD">USD</option></select>
            </span>
          </QuickAddField>
          <QuickAddField label="Notes / Remarks" className="quick-add-notes-field">
            <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Add optional employee context..." />
          </QuickAddField>
          <div className="quick-add-actions">
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save & Select Employee'}</button>
          </div>
        </form>
      </section>
    </div>
  ), document.body);
}
