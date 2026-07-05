import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import CompanyLogo from '../components/CompanyLogo';

const passwordHelp = 'Use 8+ characters with uppercase, lowercase, number, and symbol.';

export default function SecuritySetup({ mode, currentUser, onSetup, onChangePassword, onLogout, companyName, companyLogo }) {
  const [form, setForm] = useState({
    full_name: 'Administrator',
    username: 'admin',
    password: '',
    confirm_password: '',
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setupMode = mode === 'setup';

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (setupMode) {
        await onSetup({
          full_name: form.full_name,
          username: form.username,
          password: form.password,
          confirm_password: form.confirm_password,
        });
      } else {
        await onChangePassword({
          current_password: form.current_password,
          new_password: form.new_password,
          confirm_password: form.confirm_new_password,
        });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="setup-panel">
        <div className="setup-brand-row">
          <CompanyLogo logo={companyLogo} name={companyName} size="md" />
          <div>
            <strong>{companyName || 'SKY Cash Book'}</strong>
            <span>Secure account setup</span>
          </div>
        </div>
        <div className="setup-icon"><ShieldCheck size={28} /></div>
        <h1>{setupMode ? 'Create Administrator Account' : 'Change Default Password'}</h1>
        <p>
          {setupMode
            ? 'First startup requires the owner to create the Administrator account. No hardcoded password is used.'
            : `${currentUser?.full_name || 'Administrator'}, create a new password before using the cash book.`}
        </p>

        <form className="setup-form" onSubmit={submit}>
          {setupMode ? (
            <>
              <label>
                Full Name
                <input value={form.full_name} onChange={(event) => update('full_name', event.target.value)} required />
              </label>
              <label>
                Username
                <input value={form.username} onChange={(event) => update('username', event.target.value)} required />
              </label>
              <label>
                Password
                <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required />
              </label>
              <label>
                Confirm Password
                <input type="password" value={form.confirm_password} onChange={(event) => update('confirm_password', event.target.value)} required />
              </label>
            </>
          ) : (
            <>
              <label>
                Current Password
                <input type="password" value={form.current_password} onChange={(event) => update('current_password', event.target.value)} required autoFocus />
              </label>
              <label>
                New Password
                <input type="password" value={form.new_password} onChange={(event) => update('new_password', event.target.value)} required />
              </label>
              <label>
                Confirm New Password
                <input type="password" value={form.confirm_new_password} onChange={(event) => update('confirm_new_password', event.target.value)} required />
              </label>
            </>
          )}
          <div className="setup-help">{passwordHelp}</div>
          {message && <div className="setup-error">{message}</div>}
          <button className="setup-submit" type="submit" disabled={busy}>{busy ? 'Saving...' : setupMode ? 'Create Administrator' : 'Update Password'}</button>
          {!setupMode && <button className="setup-secondary" type="button" onClick={onLogout}>Back to Login</button>}
        </form>
      </section>
    </main>
  );
}
