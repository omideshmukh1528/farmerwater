import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthorityDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Authority Dashboard</h1>
          <p>Command Center - Welcome, {user?.name}!</p>
        </div>
        <button onClick={logout} className="logout-button">
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-icon">📥</div>
            <h3>View Farmer Requests</h3>
            <p>Review all water requests submitted by farmers in your region</p>
            <button className="card-button">View Requests</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">💧</div>
            <h3>Manage Canal Water</h3>
            <p>Enter and update available water in canals and reservoirs</p>
            <button className="card-button">Update Water Supply</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">⚠️</div>
            <h3>Detected Conflicts</h3>
            <p>View conflicts detected by the AI system and take action</p>
            <button className="card-button">View Conflicts</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">🔍</div>
            <h3>Review Allocations</h3>
            <p>Review AI-proposed allocations and approve or revise them</p>
            <button className="card-button">Review Proposals</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">✍️</div>
            <h3>Approve Allocations</h3>
            <p>Make final allocation decisions and send to farmers</p>
            <button className="card-button">Approve Allocations</button>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📋</div>
            <h3>Audit Records</h3>
            <p>View agreements and complete audit trail of all actions</p>
            <button className="card-button">View Audit Log</button>
          </div>
        </div>

        <div className="dashboard-info">
          <h2>About Your Account</h2>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">Authority</span>
            </div>
            <div className="info-item">
              <span className="info-label">Authority ID:</span>
              <span className="info-value">{user?.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">System:</span>
              <span className="info-value">JalMitra AI Water Governance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
