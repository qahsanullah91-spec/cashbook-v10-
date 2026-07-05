import { Building2, Contact, Plus, Search, UserRound } from 'lucide-react';
import { memo, useDeferredValue, useMemo, useState } from 'react';
import { buildAccountSearchIndex, searchAccountIndex } from '../utils/accountSearch';

const GROUP_ICONS = {
  Employees: UserRound,
  Companies: Building2,
  Accounts: Contact
};

function SmartAccountAutocomplete({
  value,
  employees,
  accounts,
  onChange,
  onSelect,
  onQuickAddEmployee
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(value);
  const index = useMemo(() => buildAccountSearchIndex({ employees, accounts }), [employees, accounts]);
  const groups = useMemo(() => searchAccountIndex(index, deferredQuery, 8), [index, deferredQuery]);
  const flatResults = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const listboxId = 'account-person-company-results';

  function choose(item) {
    onSelect(item);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(flatResults.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && open && flatResults[activeIndex]) {
      event.preventDefault();
      choose(flatResults[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="smart-party-picker">
      <Search className="smart-party-search-icon" size={19} aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(Boolean(value.trim()))}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        onKeyDown={handleKeyDown}
        placeholder="Account / Person / Company"
        aria-label="Account / Person / Company"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={open && flatResults[activeIndex] ? `${listboxId}-${flatResults[activeIndex].key}` : undefined}
        autoComplete="off"
        required
        dir="auto"
      />
      {open && value.trim() && (
        <div className="smart-party-dropdown" id={listboxId} role="listbox">
          {groups.map((group) => {
            const Icon = GROUP_ICONS[group.label];
            return (
              <section className="smart-party-group" key={group.label}>
                <header><Icon size={16} /><span>{group.label}</span></header>
                {group.items.map((item) => {
                  const itemIndex = flatResults.indexOf(item);
                  return (
                    <button
                      id={`${listboxId}-${item.key}`}
                      className={itemIndex === activeIndex ? 'active' : ''}
                      key={item.key}
                      type="button"
                      role="option"
                      aria-selected={itemIndex === activeIndex}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onClick={() => choose(item)}
                    >
                      <span className={`smart-party-avatar ${item.kind}`}>{item.kind === 'employee' ? <UserRound size={17} /> : item.kind === 'company' ? <Building2 size={17} /> : <Contact size={17} />}</span>
                      <span className="smart-party-copy">
                        <strong><HighlightedText text={item.name} query={deferredQuery} /></strong>
                        <small>{item.subtitle}</small>
                      </span>
                      <span className="smart-party-type">{item.kind}</span>
                    </button>
                  );
                })}
              </section>
            );
          })}
          {!flatResults.length && (
            <div className="smart-party-empty">
              <Search size={22} />
              <strong>No matching record</strong>
              <span>Create an employee without leaving Cash Book.</span>
            </div>
          )}
          <button
            className="smart-party-quick-add"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(false);
              onQuickAddEmployee(value.trim());
            }}
          >
            <Plus size={18} /> Add New Employee
          </button>
        </div>
      )}
    </div>
  );
}

function HighlightedText({ text, query }) {
  const needle = String(query || '').trim();
  const position = text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase());
  if (!needle || position < 0) return text;
  return (
    <>
      {text.slice(0, position)}
      <mark>{text.slice(position, position + needle.length)}</mark>
      {text.slice(position + needle.length)}
    </>
  );
}

export default memo(SmartAccountAutocomplete);
