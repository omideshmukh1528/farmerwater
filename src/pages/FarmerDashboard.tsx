import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function FarmerDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Farmer Dashboard</h1>
          <p>Welcome, {user?.name}!</p>
        </div>
        <button onClick={logout} className="logout-button">
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-icon">💧</div>
            <h3>Submit Water Request</h3>
            <p>Request water for your crops with details about crop type and required amount</p>
            <button className="card-button">New Request</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📊</div>
            <h3>View Current Allocation</h3>
            <p>Check your water allocation, usage, and remaining quota</p>
            <button className="card-button">View Allocation</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📋</div>
            <h3>Request History</h3>
            <p>Track the status of all your previous water requests</p>
            <button className="card-button">View Requests</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">⚖️</div>
            <h3>Mediation Proposals</h3>
            <p>Review proposals from the mediation center and respond</p>
            <button className="card-button">View Proposals</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">✅</div>
            <h3>Agreements</h3>
            <p>View final agreements and accepted allocations</p>
            <button className="card-button">View Agreements</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📞</div>
            <h3>Support</h3>
            <p>Get help with the platform or report issues</p>
            <button className="card-button">Contact Support</button>
          </div>
        </div>

        <div className="dashboard-info">
          <h2>About Your Account</h2>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">Farmer</span>
            </div>
            <div className="info-item">
              <span className="info-label">User ID:</span>
              <span className="info-value">{user?.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Portal:</span>
              <span className="info-value">JalMitra AI Water Governance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
