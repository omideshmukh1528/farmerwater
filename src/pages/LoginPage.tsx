import { useState } from 'react';
import { Droplets, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth, type Role } from '@/context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>('farmer');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name or ID');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await login(name, password, selectedRole);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background" />

      <div className="login-content">
        <div className="login-card">
          {/* Logo and Branding */}
          <div className="login-header">
            <div className="login-logo">
              <Droplets size={32} />
            </div>
            <h1 className="login-title">JalMitra AI</h1>
            <p className="login-subtitle">Responsible Water Governance</p>
          </div>

          {/* Role Selection */}
          <div className="login-form">
            <label className="form-label">Select Your Role</label>
            <div className="role-selection">
              <button
                type="button"
                className={`role-button ${selectedRole === 'farmer' ? 'active' : ''}`}
                onClick={() => setSelectedRole('farmer')}
                aria-pressed={selectedRole === 'farmer'}
              >
                <div className="role-icon">🌾</div>
                <div className="role-text">
                  <strong>Farmer</strong>
                  <span>Submit water requests</span>
                </div>
              </button>

              <button
                type="button"
                className={`role-button ${selectedRole === 'authority' ? 'active' : ''}`}
                onClick={() => setSelectedRole('authority')}
                aria-pressed={selectedRole === 'authority'}
              >
                <div className="role-icon">⚙️</div>
                <div className="role-text">
                  <strong>Authority</strong>
                  <span>Manage water allocation</span>
                </div>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  {selectedRole === 'farmer' ? 'Farmer Name' : 'Authority ID'}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={selectedRole === 'farmer' ? 'e.g., Ramesh Patil' : 'e.g., AUTH-001'}
                  className="form-input"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="form-input"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {/* Demo Notice */}
            <div className="demo-notice">
              <strong>Demo Access:</strong> Use any name and password to login (e.g., "demo" / "demo")
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="login-info-grid">
          <div className="info-card">
            <div className="info-icon">🚜</div>
            <strong>Farmer Portal</strong>
            <p>Submit water requests, view allocations, and manage your water needs</p>
          </div>

          <div className="info-card">
            <div className="info-icon">📊</div>
            <strong>Authority Panel</strong>
            <p>Review requests, manage canal water, and resolve conflicts</p>
          </div>

          <div className="info-card">
            <div className="info-icon">🤖</div>
            <strong>AI-Powered</strong>
            <p>Smart water allocation with human decision-making at the center</p>
          </div>
        </div>
      </div>
    </div>
  );
}
