import {
  BatteryFull,
  CircleHelp,
  Eye,
  EyeOff,
  Keyboard,
  LockKeyhole,
  Power,
  ShieldCheck,
  User
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CompanyLogo from '../components/CompanyLogo';
import { isNeonAuthEnabled, signInWithNeonAuth, signUpWithNeonAuth, getNeonAuthToken } from '../auth';
import { api, setAuthToken } from '../services/api';

function initials(name) {
  return (name || 'User').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function dateLabel(now) {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeLabel(now) {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
}

export default function LoginScreen({ users, rememberedUsername, onLogin, connectionError, isPreparing, onRetryConnection, companyName, companyLogo }) {
  const [username, setUsername] = useState(rememberedUsername || '');
  const [password, setPassword] = useState('');
  const [rememberUser, setRememberUser] = useState(Boolean(rememberedUsername));
  const [message, setMessage] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(new Date());

  // Neon Auth state
  const [neonAuthMode, setNeonAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [neonEmail, setNeonEmail] = useState('');
  const [neonPassword, setNeonPassword] = useState('');
  const [neonName, setNeonName] = useState('');
  const [neonMessage, setNeonMessage] = useState('');
  const [isNeonSubmitting, setIsNeonSubmitting] = useState(false);
  const [showNeonSection, setShowNeonSection] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (rememberedUsername) {
      setUsername(rememberedUsername);
    }
  }, [rememberedUsername]);

  async function submit(event) {
    event?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage('Enter your username and password to continue.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      await onLogin({ username: username.trim(), password, remember_user: rememberUser });
    } catch (error) {
      setMessage(error.message);
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitNeonAuth(event) {
    event?.preventDefault();
    if (!neonEmail.trim() || !neonPassword.trim()) {
      setNeonMessage('Enter your email and password.');
      return;
    }
    setIsNeonSubmitting(true);
    setNeonMessage('');
    try {
      let result;
      if (neonAuthMode === 'signup') {
        result = await signUpWithNeonAuth(neonEmail.trim(), neonPassword, neonName.trim());
      } else {
        result = await signInWithNeonAuth(neonEmail.trim(), neonPassword);
      }
      if (result?.error) {
        setNeonMessage(result.error.message || 'Authentication failed.');
        return;
      }
      // Get the JWT from the Neon Auth session
      const jwtToken = await getNeonAuthToken();
      if (!jwtToken) {
        setNeonMessage('Could not retrieve session token from Neon Auth.');
        return;
      }
      // Exchange the JWT for a standard cashbook session token
      const loginResp = await api.neonAuthLogin(jwtToken);
      if (loginResp?.token) {
        setAuthToken(loginResp.token);
        await onLogin({ _neonAuthResponse: loginResp });
      } else {
        setNeonMessage('Sign-in succeeded but no session was returned. Please try again.');
      }
    } catch (error) {
      setNeonMessage(error.message || 'Neon Auth error. Please try again.');
    } finally {
      setIsNeonSubmitting(false);
    }
  }

  return (
    <main className={`login-screen ${isSubmitting ? 'login-success' : ''}`}>
      <div className="login-top-controls" aria-hidden="true">
        <span>U.S.</span>
        <Keyboard size={18} />
        <BatteryFull size={22} />
        <Power size={21} />
      </div>

      <section className="login-panel">
        <div className="login-intro">
          <div className="login-time-display" aria-label={`${dateLabel(now)}, ${timeLabel(now)}`}>
            <p className="login-date">{dateLabel(now)}</p>
            <h1 className="login-time">{timeLabel(now)}</h1>
          </div>

          <div className="login-brand-block">
            <CompanyLogo logo={companyLogo} name={companyName} size="lg" />
            <div>
              <strong>{companyName || 'SKY Cash Book'}</strong>
              <span>Enterprise Cash Book Accounting</span>
            </div>
          </div>

          <div className="login-intro-copy">
            <h2>Welcome back</h2>
            <p>Sign in to manage your cash book, accounts, reports, and daily business activity.</p>
          </div>

          <div className="login-security-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Secure access</strong>
              <span>Your account is protected by encrypted authentication.</span>
            </div>
          </div>
        </div>

        <div className="login-form-card">
          <div className="login-form-heading">
            <span className="login-lock-icon"><LockKeyhole size={21} /></span>
            <div>
              <h2>Sign in</h2>
              <p>Enter your username and password to access the system.</p>
            </div>
          </div>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field-label" htmlFor="login-username">Username</label>
            <div className="login-password-shell" style={{ marginBottom: '16px' }}>
              <User size={18} />
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                required
                disabled={isSubmitting || isPreparing}
              />
            </div>

            <label className="login-field-label" htmlFor="login-password">Password</label>
            <div className="login-password-shell">
              <LockKeyhole size={18} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isSubmitting || isPreparing}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="login-form-options">
              <label className="remember-user">
                <input type="checkbox" checked={rememberUser} onChange={(event) => setRememberUser(event.target.checked)} />
                <span>Remember me</span>
              </label>
              <button className="forgot-password-link" type="button" onClick={() => setHelpOpen((value) => !value)}>
                <CircleHelp size={16} />
                Forgot password?
              </button>
            </div>

            {helpOpen && (
              <div className="login-help-popover">
                <strong>Password assistance</strong>
                <span>Contact your administrator to reset your password.</span>
              </div>
            )}
            {connectionError && (
              <div className="login-connection-alert">
                <strong>Backend connection needed</strong>
                <span>{connectionError}</span>
                <button type="button" onClick={onRetryConnection}>Retry Connection</button>
              </div>
            )}
            {message && <p className="login-message" role="alert">{message}</p>}

            <button className="login-submit-full" type="submit" disabled={isSubmitting || isPreparing || !password.trim()}>
              {isPreparing ? 'Connecting...' : isSubmitting ? 'Signing in...' : 'Sign in securely'}
            </button>
          </form>

          <p className="login-required" aria-live="polite">
            {isPreparing ? 'Checking secure server...' : isSubmitting ? 'Signing in securely...' : 'Authorized users only'}
          </p>

          {isNeonAuthEnabled && (
            <div className="login-neon-auth-section">
              <div className="login-divider" aria-hidden="true">
                <span>or</span>
              </div>

              {!showNeonSection ? (
                <button
                  id="btn-neon-auth-toggle"
                  className="login-neon-auth-toggle"
                  type="button"
                  onClick={() => setShowNeonSection(true)}
                >
                  Continue with Neon Auth
                </button>
              ) : (
                <div className="login-neon-auth-form-wrap">
                  <div className="login-neon-auth-tabs">
                    <button
                      id="btn-neon-signin-tab"
                      type="button"
                      className={neonAuthMode === 'signin' ? 'active' : ''}
                      onClick={() => { setNeonAuthMode('signin'); setNeonMessage(''); }}
                    >Sign in</button>
                    <button
                      id="btn-neon-signup-tab"
                      type="button"
                      className={neonAuthMode === 'signup' ? 'active' : ''}
                      onClick={() => { setNeonAuthMode('signup'); setNeonMessage(''); }}
                    >Create account</button>
                  </div>

                  <form className="login-neon-auth-form" onSubmit={submitNeonAuth} noValidate>
                    {neonAuthMode === 'signup' && (
                      <input
                        id="neon-auth-name"
                        type="text"
                        placeholder="Your name"
                        value={neonName}
                        onChange={(e) => setNeonName(e.target.value)}
                        disabled={isNeonSubmitting}
                        autoComplete="name"
                      />
                    )}
                    <input
                      id="neon-auth-email"
                      type="email"
                      placeholder="Email address"
                      value={neonEmail}
                      onChange={(e) => setNeonEmail(e.target.value)}
                      disabled={isNeonSubmitting}
                      autoComplete="email"
                      required
                    />
                    <input
                      id="neon-auth-password"
                      type="password"
                      placeholder="Password"
                      value={neonPassword}
                      onChange={(e) => setNeonPassword(e.target.value)}
                      disabled={isNeonSubmitting}
                      autoComplete={neonAuthMode === 'signup' ? 'new-password' : 'current-password'}
                      required
                    />
                    {neonMessage && (
                      <p className="login-message" role="alert">{neonMessage}</p>
                    )}
                    <button
                      id="btn-neon-auth-submit"
                      className="login-submit-full"
                      type="submit"
                      disabled={isNeonSubmitting || !neonEmail.trim() || !neonPassword.trim()}
                    >
                      {isNeonSubmitting
                        ? 'Please wait...'
                        : neonAuthMode === 'signup'
                          ? 'Create account'
                          : 'Sign in'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
