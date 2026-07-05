import { useRef, useState } from 'react';

const emptyUser = { id: null, full_name: '', username: '', password: '', confirm_password: '', role: 'Cashier', avatar_path: '', is_active: true };
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';

function avatarFromFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.onerror = () => callback('');
  reader.readAsDataURL(file);
}

export default function UserAccounts({ currentUser, users, onCreate, onUpdate, onDelete, onResetPassword, onReload }) {
  const [form, setForm] = useState(emptyUser);
  const [customPassword, setCustomPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingAction, setLoadingAction] = useState('');
  const fileInputRef = useRef(null);
  const canAdmin = currentUser?.role === 'Administrator';

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const resetForm = ({ keepSuccess = '' } = {}) => {
    setForm(emptyUser);
    setCustomPassword('');
    setGeneratedPassword('');
    setMessage('');
    setSuccessMessage(keepSuccess);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const edit = (user) => {
    setForm({ ...emptyUser, ...user, password: '', confirm_password: '' });
    setCustomPassword('');
    setGeneratedPassword('');
    setMessage('');
    setSuccessMessage(`Editing ${user.full_name || user.username}.`);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  function validateForm() {
    const errors = {};
    const fullName = form.full_name.trim();
    const username = form.username.trim();
    if (!fullName) errors.full_name = 'Full Name is required.';
    if (!username) errors.username = 'Username is required.';
    const duplicate = users.some((user) => (
      user.id !== form.id && user.username?.trim().toLowerCase() === username.toLowerCase()
    ));
    if (username && duplicate) errors.username = 'Username already exists.';
    if (!form.id) {
      if (!form.password) errors.password = 'Password is required.';
      else if (!isStrongPassword(form.password)) errors.password = PASSWORD_MESSAGE;
      if (!form.confirm_password) errors.confirm_password = 'Confirm Password is required.';
      else if (form.password !== form.confirm_password) errors.confirm_password = 'Password does not match.';
    }
    setFieldErrors(errors);
    return errors;
  }

  function isStrongPassword(password) {
    return password.length >= 8
      && /[A-Z]/.test(password)
      && /[a-z]/.test(password)
      && /\d/.test(password)
      && /[^A-Za-z0-9]/.test(password);
  }
  function friendlyError(error, fallback) {
    const text = error?.message || fallback;
    if (text.includes('Username already exists')) return 'Username already exists.';
    if (text.includes('Passwords do not match')) return 'Password does not match.';
    if (text.includes('Password must')) return text.replace(/^Server error \(\d+\):\s*/, '');
    if (text.includes('Login required')) return 'Your admin session expired. Please log in again.';
    if (text.includes('Administrator access required')) return 'Administrator access required.';
    return fallback;
  }

  async function save(event) {
    event.preventDefault();
    if (!canAdmin) return;
    setMessage('');
    setSuccessMessage('');
    const errors = validateForm();
    if (Object.keys(errors).length) {
      setMessage(Object.values(errors)[0]);
      return;
    }
    setLoadingAction(form.id ? 'save' : 'add');
    try {
      const basePayload = {
        fullName: form.full_name.trim(),
        username: form.username.trim(),
        role: form.role,
        status: form.is_active ? 'Active' : 'Inactive',
        avatar: form.avatar_path || '',
      };
      if (form.id) {
        await onUpdate(form.id, basePayload);
        resetForm({ keepSuccess: 'User updated successfully.' });
      } else {
        await onCreate({
          ...basePayload,
          password: form.password,
        });
        resetForm({ keepSuccess: 'User added successfully.' });
      }
      await onReload?.();
    } catch (error) {
      setMessage(friendlyError(error, form.id ? 'Failed to update user.' : 'Failed to add user.'));
    } finally {
      setLoadingAction('');
    }
  }

  async function resetPassword(userId, generated = false) {
    if (!canAdmin || (!generated && !form.id)) return;
    setMessage('');
    setSuccessMessage('');
    if (!generated && !isStrongPassword(customPassword)) {
      setFieldErrors({ customPassword: PASSWORD_MESSAGE });
      setMessage(PASSWORD_MESSAGE);
      return;
    }
    setLoadingAction(generated ? `generate-${userId}` : 'custom-password');
    try {
      const result = await onResetPassword(userId, { password: generated ? null : customPassword });
      setGeneratedPassword(result?.password || '');
      setCustomPassword('');
      setFieldErrors((current) => ({ ...current, customPassword: '' }));
      setSuccessMessage(generated ? 'Strong password generated. Copy it now before leaving this page.' : 'Password updated successfully.');
    } catch (error) {
      setMessage(friendlyError(error, 'Failed to reset password.'));
    } finally {
      setLoadingAction('');
    }
  }

  async function copyGeneratedPassword() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setSuccessMessage('Generated password copied.');
    } catch {
      setMessage('Could not copy automatically. Select the generated password and copy it manually.');
    }
  }

  function useGeneratedPassword() {
    if (!generatedPassword) return;
    setCustomPassword(generatedPassword);
    setFieldErrors((current) => ({ ...current, customPassword: '' }));
  }

  return (
    <div className="glass-card form-card user-admin-panel">
      <div className="card-header">
        <div>
          <h3>User Accounts</h3>
          <p className="muted">Administrators can manage login users, avatars, roles, status, and password resets.</p>
        </div>
        <button className="ghost-btn" type="button" onClick={onReload}>Refresh Users</button>
      </div>

      {!canAdmin && <div className="error-banner">Only Administrators can manage user accounts.</div>}
      {message && <div className="error-banner">{message}</div>}
      {successMessage && <div className="success-banner">{successMessage}</div>}

      <form className="settings-form user-form" onSubmit={save}>
        <label>Full Name<input className={fieldErrors.full_name ? 'invalid-field' : ''} value={form.full_name} onChange={(event) => update('full_name', event.target.value)} required disabled={!canAdmin || !!loadingAction} />{fieldErrors.full_name && <span className="field-error">{fieldErrors.full_name}</span>}</label>
        <label>Username<input className={fieldErrors.username ? 'invalid-field' : ''} value={form.username} onChange={(event) => update('username', event.target.value)} required disabled={!canAdmin || !!loadingAction} />{fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}</label>
        {!form.id && <label>Password<input className={fieldErrors.password ? 'invalid-field' : ''} type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required disabled={!canAdmin || !!loadingAction} />{fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}</label>}
        {!form.id && <label>Confirm Password<input className={fieldErrors.confirm_password ? 'invalid-field' : ''} type="password" value={form.confirm_password} onChange={(event) => update('confirm_password', event.target.value)} required disabled={!canAdmin || !!loadingAction} />{fieldErrors.confirm_password && <span className="field-error">{fieldErrors.confirm_password}</span>}</label>}
        <label>Role<select value={form.role} onChange={(event) => update('role', event.target.value)} disabled={!canAdmin || !!loadingAction}><option>Administrator</option><option>Manager</option><option>Cashier</option><option>Viewer</option></select></label>
        <label>Status<select value={form.is_active ? 'active' : 'inactive'} onChange={(event) => update('is_active', event.target.value === 'active')} disabled={!canAdmin || !!loadingAction}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label>Avatar<input ref={fileInputRef} type="file" accept="image/*" disabled={!canAdmin || !!loadingAction} onChange={(event) => event.target.files?.[0] && avatarFromFile(event.target.files[0], (value) => update('avatar_path', value))} /></label>
        {form.avatar_path && <img className="user-avatar-preview" src={form.avatar_path} alt="" />}
        <div className="section-actions">
          <button className="primary-btn" disabled={!canAdmin || !!loadingAction} type="submit">{loadingAction === 'add' ? 'Adding...' : loadingAction === 'save' ? 'Saving...' : form.id ? 'Update User' : 'Add User'}</button>
          <button className="ghost-btn" type="button" onClick={resetForm} disabled={!!loadingAction}>Clear</button>
        </div>
      </form>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            {!users.length && <tr><td colSpan="6"><div className="empty-state">No users found.</div></td></tr>}
            {users.map((user) => (
              <tr key={user.id}>
                <td><div className="user-cell">{user.avatar_path ? <img src={user.avatar_path} alt="" /> : <span>{user.full_name?.[0]}</span>}<strong>{user.full_name}</strong></div></td>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? 'Active' : 'Inactive'}</td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                <td>
                  <div className="row-actions">
                    <button className="ghost-btn table-action" type="button" onClick={() => edit(user)} disabled={!canAdmin || !!loadingAction}>Edit</button>
                    <button className="ghost-btn table-action" type="button" onClick={() => resetPassword(user.id, true)} disabled={!canAdmin || !!loadingAction}>{loadingAction === `generate-${user.id}` ? 'Generating...' : 'Generate Password'}</button>
                    <button className="danger-btn table-action" type="button" onClick={() => onDelete(user)} disabled={!canAdmin || currentUser?.id === user.id || !!loadingAction}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="password-reset-row">
        <input className={fieldErrors.customPassword ? 'invalid-field' : ''} type="password" value={customPassword} onChange={(event) => { setCustomPassword(event.target.value); setFieldErrors((current) => ({ ...current, customPassword: '' })); }} placeholder="Set custom password for selected edited user" disabled={!form.id || !canAdmin || !!loadingAction} />
        <button className="ghost-btn" type="button" disabled={!form.id || !customPassword || !canAdmin || !!loadingAction} onClick={() => resetPassword(form.id, false)}>{loadingAction === 'custom-password' ? 'Saving...' : 'Set Custom Password'}</button>
        {fieldErrors.customPassword && <span className="field-error full-width">{fieldErrors.customPassword}</span>}
      </div>
      {generatedPassword && (
        <div className="success-banner generated-password-banner">
          Generated password: <strong>{generatedPassword}</strong>
          <button className="ghost-btn table-action" type="button" onClick={copyGeneratedPassword}>Copy</button>
          {form.id && <button className="ghost-btn table-action" type="button" onClick={useGeneratedPassword}>Use for edited user</button>}
        </div>
      )}
    </div>
  );
}
