import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  CloudRain,
  Droplets,
  FileText,
  Gauge,
  Info,
  Leaf,
  ListFilter,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Role = 'farmer' | 'authority';
type View = 'overview' | 'requests' | 'intelligence' | 'mediation' | 'audit';
type RequestStatus = 'under_review' | 'approved' | 'needs_info';

type Farmer = {
  id: string;
  name: string;
  village: string;
  crop: string;
  crop_stage: string;
  area_acres: number;
  entitlement_liters: number;
  received_liters: number;
  channel: string;
};

type WaterRequest = {
  id: string;
  farmer_id: string;
  request_text: string;
  crop: string;
  crop_stage: string;
  liters_requested: number;
  urgency: string;
  status: RequestStatus;
  missing_info: string[];
  conflict_flag: boolean;
  recommendation: string;
  fairness_score: number;
  risk_score: number;
  created_at: string;
};

type AuditEvent = {
  id: string;
  request_id: string | null;
  event_type: string;
  title: string;
  detail: string;
  created_at: string;
};

const fallbackFarmer: Farmer = {
  id: 'FMH-1042',
  name: 'Ramesh Patil',
  village: 'Khed, Maharashtra',
  crop: 'Soybean',
  crop_stage: 'Flowering stage',
  area_acres: 2.4,
  entitlement_liters: 60000,
  received_liters: 42000,
  channel: 'Canal 2',
};

const fallbackRequest: WaterRequest = {
  id: 'REQ-2408',
  farmer_id: 'FMH-1042',
  request_text: 'My soybean is flowering, I need 30,000 L urgently.',
  crop: 'Soybean',
  crop_stage: 'Flowering stage',
  liters_requested: 30000,
  urgency: 'high',
  status: 'under_review',
  missing_info: [],
  conflict_flag: false,
  recommendation: 'Option B · Balanced allocation',
  fairness_score: 92,
  risk_score: 18,
  created_at: new Date().toISOString(),
};

const fallbackEvents: AuditEvent[] = [
  { id: '1', request_id: 'REQ-2408', event_type: 'request', title: 'Request received', detail: 'Natural-language request translated into a reviewable water claim.', created_at: new Date().toISOString() },
  { id: '2', request_id: 'REQ-2408', event_type: 'ai', title: 'AI extraction complete', detail: 'Crop, stage, urgency and 30,000 L need identified.', created_at: new Date().toISOString() },
];

const navItems: { id: View; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'requests', label: 'Water requests', icon: FileText },
  { id: 'intelligence', label: 'Water intelligence', icon: Waves },
  { id: 'mediation', label: 'Mediation center', icon: Scale },
  { id: 'audit', label: 'Audit log', icon: ClipboardCheck },
];

const viewHeadings: Record<View, { eyebrow: (role: Role) => string; title: (role: Role) => string; subtitle: (role: Role) => string }> = {
  overview: {
    eyebrow: (role: Role) => role === 'farmer' ? 'Farmer portal · Khed, Maharashtra' : 'District command center · Nashik division',
    title: (role: Role) => role === 'farmer' ? 'Good morning, Ramesh.' : 'Good morning, Authority.',
    subtitle: (role: Role) => role === 'farmer' ? 'Here is your water allocation at a glance.' : 'Review recommendations, spot conflicts, and keep allocations fair.',
  },
  requests: {
    eyebrow: () => 'Water request management',
    title: (role: Role) => role === 'farmer' ? 'Your water requests' : 'Review queue',
    subtitle: (role: Role) => role === 'farmer' ? 'Track the status of every request you have submitted.' : 'Review and act on every water request in the system.',
  },
  intelligence: {
    eyebrow: () => 'Water intelligence system',
    title: () => 'Distribution & supply health',
    subtitle: () => 'Real-time canal flow, reservoir levels, and demand forecasting.',
  },
  mediation: {
    eyebrow: () => 'Mediation center',
    title: () => 'Conflict resolution',
    subtitle: () => 'Active disputes and their resolution status.',
  },
  audit: {
    eyebrow: () => 'Audit trail',
    title: () => 'System activity log',
    subtitle: () => 'Every action taken in JalMitra, in order.',
  },
};

function formatLiters(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<Role>('farmer');
  const [view, setView] = useState<View>('overview');
  const [farmer, setFarmer] = useState<Farmer>(fallbackFarmer);
  const [requests, setRequests] = useState<WaterRequest[]>([fallbackRequest]);
  const [events, setEvents] = useState<AuditEvent[]>(fallbackEvents);
  const [loading, setLoading] = useState(true);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<WaterRequest | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState('REQ-2408');
  const [toast, setToast] = useState('');
  const [isListening, setListening] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? requests[0] ?? fallbackRequest,
    [requests, selectedRequestId],
  );
  const remainingLiters = Math.max(farmer.entitlement_liters - farmer.received_liters, 0);
  const allocationPercent = Math.round((farmer.received_liters / farmer.entitlement_liters) * 100);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const storedRole = (newSession.user.user_metadata as { role?: Role } | null)?.role;
        if (storedRole === 'farmer' || storedRole === 'authority') setRole(storedRole);
      }
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    async function loadDemoData(): Promise<void> {
      const [farmerResult, requestResult, eventResult] = await Promise.all([
        supabase.from('jalmitra_farmers').select('*').eq('id', 'FMH-1042').maybeSingle(),
        supabase.from('jalmitra_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('jalmitra_audit_events').select('*').order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (farmerResult.data) setFarmer(farmerResult.data as Farmer);
      if (requestResult.data?.length) setRequests(requestResult.data as WaterRequest[]);
      if (eventResult.data?.length) setEvents(eventResult.data as AuditEvent[]);
      setLoading(false);
    }
    void loadDemoData();
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function submitRequest(): Promise<void> {
    const trimmed = requestText.trim();
    if (!trimmed) return;
    const id = `REQ-${Math.floor(2409 + Math.random() * 90)}`;
    const nextRequest: WaterRequest = {
      ...fallbackRequest,
      id,
      request_text: trimmed,
      created_at: new Date().toISOString(),
      status: 'under_review',
    };
    const { error } = await supabase.from('jalmitra_requests').insert(nextRequest);
    if (!error) {
      await supabase.from('jalmitra_audit_events').insert([
        { request_id: id, event_type: 'request', title: 'Request received', detail: 'Natural-language request translated into a reviewable water claim.' },
        { request_id: id, event_type: 'ai', title: 'AI extraction complete', detail: 'Crop, stage and urgency extracted for human review.' },
      ]);
    }
    setRequests((current) => [nextRequest, ...current]);
    setEvents((current) => [
      { id: `${id}-request`, request_id: id, event_type: 'request', title: 'Request received', detail: 'Natural-language request translated into a reviewable water claim.', created_at: nextRequest.created_at },
      { id: `${id}-ai`, request_id: id, event_type: 'ai', title: 'AI extraction complete', detail: 'Crop, stage and urgency extracted for human review.', created_at: nextRequest.created_at },
      ...current,
    ]);
    setSubmittedRequest(nextRequest);
    setSelectedRequestId(id);
    setRequestText('');
    setComposerOpen(false);
    setToast(error ? 'Request saved in demo mode.' : 'Request submitted for human review.');
  }

  async function approveRequest(): Promise<void> {
    const { error } = await supabase.from('jalmitra_requests').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', selectedRequest.id);
    const approved = { ...selectedRequest, status: 'approved' as RequestStatus };
    setRequests((current) => current.map((request) => request.id === selectedRequest.id ? approved : request));
    setSubmittedRequest(approved);
    setEvents((current) => [{ id: `${selectedRequest.id}-approved`, request_id: selectedRequest.id, event_type: 'approval', title: 'Allocation approved', detail: 'Human authority approved Option B · Balanced allocation.', created_at: new Date().toISOString() }, ...current]);
    setToast(error ? 'Approval shown in demo mode.' : 'Allocation approved and farmer notified.');
  }

  function simulateVoice(): void {
    setListening(true);
    window.setTimeout(() => {
      setListening(false);
      setRequestText('My soybean is flowering, I need 30,000 L urgently.');
      setToast('Voice note transcribed in English.');
    }, 1200);
  }

  function handleNav(nextView: View): void {
    setView(nextView);
    setMobileNavOpen(false);
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    setSession(null);
    setRole('farmer');
    setView('overview');
  }

  const heading = viewHeadings[view];

  if (authReady && !session) {
    return <LoginPage onSignedIn={(newRole: Role) => { setRole(newRole); }} />;
  }

  if (!authReady) {
    return <div className="auth-splash"><div className="auth-splash-content"><div className="brand-mark"><Droplets size={24} strokeWidth={2.6} /></div><RefreshCw size={20} className="spin" /></div></div>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Droplets size={19} strokeWidth={2.6} /></div>
          <div><strong>JalMitra</strong><span>AI water governance</span></div>
        </div>
        <div className="demo-pill"><span className="pulse-dot" /> Synthetic demo data</div>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => handleNav(id)}>
              <Icon size={17} /> <span>{label}</span>{id === 'requests' && <b>{requests.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="guardrail-note"><ShieldCheck size={16} /><div><strong>Human governed</strong><span>AI recommends. Humans decide.</span></div></div>
          <button className="help-button"><CircleHelp size={17} /> Help & documentation</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ArrowRight size={13} /><strong>{role === 'farmer' ? 'Farmer portal' : 'Authority command center'}</strong></div>
          <div className="topbar-actions">
            <span className="user-email">{session?.user?.email ?? 'Signed in'}</span>
            <button className="icon-button notification"><Bell size={18} /><span /></button>
            <div className="avatar">{role === 'farmer' ? 'F' : 'A'}</div>
            <button className="signout-button" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button>
          </div>
        </header>

        <div className="page-wrap">
          <div className="page-heading">
            <div><div className="eyebrow">{heading.eyebrow(role)}</div><h1>{heading.title(role)}</h1><p>{heading.subtitle(role)}</p></div>
            <div className="heading-actions"><span className="live-status"><span className="pulse-dot" /> System operational</span><button className="outline-button"><RefreshCw size={15} /> Refresh</button></div>
          </div>

          {view === 'overview' && (role === 'farmer' ? (
            <FarmerPortal farmer={farmer} remainingLiters={remainingLiters} allocationPercent={allocationPercent} requests={requests} selectedRequest={selectedRequest} submittedRequest={submittedRequest} onNewRequest={() => setComposerOpen(true)} onSelectRequest={setSelectedRequestId} onTrack={() => { setView('requests'); setToast('Showing your request timeline.'); }} />
          ) : (
            <AuthorityCenter requests={requests} selectedRequest={selectedRequest} events={events} onSelectRequest={setSelectedRequestId} onApprove={approveRequest} onOpenMediation={() => setView('mediation')} onOpenIntelligence={() => setView('intelligence')} onOpenAudit={() => setView('audit')} />
          ))}

          {view === 'requests' && (
            <RequestsView role={role} requests={requests} selectedRequest={selectedRequest} events={events} onSelectRequest={setSelectedRequestId} onApprove={approveRequest} onNewRequest={() => setComposerOpen(true)} />
          )}

          {view === 'intelligence' && (
            <IntelligenceView role={role} />
          )}

          {view === 'mediation' && (
            <MediationView role={role} requests={requests} onSelectRequest={setSelectedRequestId} />
          )}

          {view === 'audit' && (
            <AuditView events={events} />
          )}

          <footer className="footer-note"><span><Info size={14} /> All figures are synthetic demonstration data.</span><span>JalMitra AI · Responsible water governance prototype</span></footer>
        </div>
      </main>

      {isComposerOpen && <div className="modal-backdrop" onMouseDown={() => setComposerOpen(false)}><div className="request-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><div className="eyebrow">New water request</div><h2>Tell us what you need.</h2><p>Write naturally. JalMitra will extract the details for review.</p></div><button className="close-button" onClick={() => setComposerOpen(false)}><X size={18} /></button></div><textarea autoFocus value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder="e.g. My soybean is flowering, I need 30,000 L urgently." /><div className="suggestion-row"><button onClick={() => setRequestText('My soybean is flowering, I need 30,000 L urgently.')}>Use demo request</button><button onClick={simulateVoice}><Mic size={14} /> {isListening ? 'Listening…' : 'Speak request'}</button></div><div className="extract-preview"><Sparkles size={16} /><div><strong>AI extraction preview</strong><span>Crop, stage, urgency and missing information will be identified automatically.</span></div></div><div className="modal-actions"><button className="text-button" onClick={() => setComposerOpen(false)}>Cancel</button><button className="primary-button" disabled={!requestText.trim()} onClick={() => void submitRequest()}>Submit for review <ArrowRight size={16} /></button></div></div></div>}
      {toast && <div className="toast"><CheckCircle2 size={17} /> {toast}</div>}
      {loading && <div className="loading-strip"><RefreshCw size={14} className="spin" /> Loading live demo data…</div>}
    </div>
  );
}

/* ── Overview: Farmer Portal ── */

type FarmerPortalProps = { farmer: Farmer; remainingLiters: number; allocationPercent: number; requests: WaterRequest[]; selectedRequest: WaterRequest; submittedRequest: WaterRequest | null; onNewRequest: () => void; onSelectRequest: (id: string) => void; onTrack: () => void };

function FarmerPortal({ farmer, remainingLiters, allocationPercent, requests, selectedRequest, submittedRequest, onNewRequest, onSelectRequest, onTrack }: FarmerPortalProps) {
  return <>
    <section className="stat-grid farmer-stats"><StatCard label="Your crop" value={farmer.crop} meta={farmer.crop_stage} icon={<Leaf />} tone="green" /><StatCard label="Area cultivated" value={`${farmer.area_acres} acres`} meta="Registered area" icon={<Map />} tone="blue" /><StatCard label="Water received" value={`${formatLiters(farmer.received_liters)} L`} meta={`${allocationPercent}% of entitlement`} icon={<Droplets />} tone="aqua" /><StatCard label="Remaining entitlement" value={`${formatLiters(remainingLiters)} L`} meta="Available this cycle" icon={<Gauge />} tone="amber" /></section>
    <div className="content-grid farmer-grid"><div className="primary-column"><section className="panel request-hero"><div className="panel-heading"><div><div className="eyebrow">Water requests</div><h2>Need water or want to report an issue?</h2><p>Describe your situation in your own words. You stay in control at every step.</p></div><div className="hero-icon"><Mic size={23} /></div></div><button className="request-input" onClick={onNewRequest}><span>“My soybean is flowering, I need more water…”</span><ArrowRight size={17} /></button><div className="request-helper"><span><Sparkles size={14} /> AI extracts the details</span><span><ShieldCheck size={14} /> Human approval required</span><span><Clock3 size={14} /> Typical response: 2h</span></div></section>
      <section className="panel allocation-panel"><div className="panel-heading compact"><div><div className="eyebrow">Current allocation</div><h2>Canal 2 · Khed distributary</h2></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="allocation-layout"><div className="donut" style={{ '--progress': `${allocationPercent * 3.6}deg` } as React.CSSProperties}><div><strong>{allocationPercent}%</strong><span>received</span></div></div><div className="allocation-info"><div className="allocation-line"><span>Received so far</span><strong>{formatLiters(farmer.received_liters)} L</strong></div><div className="allocation-line"><span>Entitlement</span><strong>{formatLiters(farmer.entitlement_liters)} L</strong></div><div className="progress-track"><span style={{ width: `${allocationPercent}%` }} /></div><p><span className="status-dot green" /> Your allocation is on track for this cycle.</p></div></div></section>
      <section className="panel"><div className="panel-heading compact"><div><div className="eyebrow">Recent requests</div><h2>Your request history</h2></div><button className="link-button" onClick={onTrack}>View all <ArrowRight size={14} /></button></div><RequestList requests={requests} selectedRequestId={selectedRequest.id} onSelectRequest={onSelectRequest} /></section>
    </div><aside className="secondary-column"><StatusCard request={submittedRequest ?? selectedRequest} onTrack={onTrack} /><section className="panel timeline-panel"><div className="panel-heading compact"><div><div className="eyebrow">Latest update</div><h2>Request timeline</h2></div><Activity size={18} className="muted-icon" /></div><Timeline status={selectedRequest.status} /></section><section className="tip-card"><div className="tip-icon"><Zap size={18} /></div><div><strong>Good to know</strong><p>JalMitra never makes an allocation decision automatically. A water officer reviews every recommendation.</p></div></section></aside></div>
  </>;
}

/* ── Overview: Authority Center ── */

type AuthorityProps = { requests: WaterRequest[]; selectedRequest: WaterRequest; events: AuditEvent[]; onSelectRequest: (id: string) => void; onApprove: () => void; onOpenMediation: () => void; onOpenIntelligence: () => void; onOpenAudit: () => void };
function AuthorityCenter({ requests, selectedRequest, events, onSelectRequest, onApprove, onOpenMediation, onOpenIntelligence, onOpenAudit }: AuthorityProps) {
  return <><section className="stat-grid authority-stats"><StatCard label="Open requests" value={String(requests.length)} meta="Needs attention" icon={<FileText />} tone="blue" /><StatCard label="Water in system" value="2.4M L" meta="Across 6 outlets" icon={<Waves />} tone="aqua" /><StatCard label="Potential conflicts" value="3" meta="Needs verification" icon={<AlertTriangle />} tone="red" /><StatCard label="Avg. response SLA" value="1h 42m" meta="18m ahead of target" icon={<Clock3 />} tone="green" /></section><div className="authority-layout"><div className="authority-main"><section className="panel queue-panel"><div className="panel-heading compact"><div><div className="eyebrow">Review queue</div><h2>Requests needing attention</h2></div><div className="filter-actions"><button className="outline-button small"><ListFilter size={14} /> Filter</button><button className="icon-button small"><Search size={16} /></button></div></div><RequestList requests={requests} selectedRequestId={selectedRequest.id} onSelectRequest={onSelectRequest} authority /></section><section className="panel conflict-panel"><div className="panel-heading compact"><div><div className="eyebrow">Water intelligence</div><h2>Distribution health</h2></div><button className="link-button" onClick={onOpenIntelligence}>Open intelligence <ArrowRight size={14} /></button></div><div className="mini-chart"><div className="chart-labels"><span>Canal 1</span><strong>92%</strong></div><div className="chart-track"><span style={{ width: '92%' }} /></div><div className="chart-labels"><span>Canal 2</span><strong>70%</strong></div><div className="chart-track"><span className="blue-fill" style={{ width: '70%' }} /></div><div className="chart-labels"><span>Canal 3</span><strong>48%</strong></div><div className="chart-track"><span className="amber-fill" style={{ width: '48%' }} /></div></div><div className="intelligence-alert"><AlertTriangle size={16} /><span>Canal 3 has 3 requests above available flow. Review recommended before next release.</span><ArrowRight size={15} /></div></section></div><aside className="authority-side"><section className="panel review-panel"><div className="panel-heading compact"><div><div className="eyebrow">Mediation center</div><h2>Review recommendation</h2></div><span className="review-id">{selectedRequest.id}</span></div><div className="reviewer-line"><div className="avatar small">RP</div><div><strong>Ramesh Patil</strong><span>Khed, Maharashtra · Soybean</span></div><span className="priority-badge">High priority</span></div><blockquote>“{selectedRequest.request_text}”</blockquote><div className="recommendation"><div className="rec-top"><span><Sparkles size={15} /> Recommended path</span><span className="score-pill">92 fairness</span></div><strong>{selectedRequest.recommendation}</strong><p>Release 18,000 L now and schedule 12,000 L in the next canal window. This protects flowering stage without exceeding the current outlet balance.</p></div><button className="explain-button"><CircleHelp size={15} /> Why this recommendation? <ArrowRight size={14} /></button><div className="review-actions"><button className="reject-button"><X size={15} /> Request changes</button><button className="approve-button" onClick={onApprove}><Check size={15} /> Approve allocation</button></div><div className="human-note"><ShieldCheck size={14} /> AI recommendation · human decision required</div></section><section className="panel audit-mini"><div className="panel-heading compact"><div><div className="eyebrow">Audit trail</div><h2>Latest activity</h2></div><button className="link-button" onClick={onOpenAudit}>View all <ArrowRight size={14} /></button></div>{events.slice(0, 3).map((event) => <div className="audit-row" key={event.id}><div className={`audit-icon ${event.event_type}`}><Activity size={14} /></div><div><strong>{event.title}</strong><span>{event.detail}</span></div><time>{formatTime(event.created_at)}</time></div>)}</section></aside></div></>;
}

/* ── Requests View ── */

type RequestsViewProps = { role: Role; requests: WaterRequest[]; selectedRequest: WaterRequest; events: AuditEvent[]; onSelectRequest: (id: string) => void; onApprove: () => void; onNewRequest: () => void };
function RequestsView({ role, requests, selectedRequest, events, onSelectRequest, onApprove, onNewRequest }: RequestsViewProps) {
  const requestEvents = events.filter((event) => event.request_id === selectedRequest.id);
  return <div className="requests-view-layout">
    <div className="requests-view-list">
      <section className="panel">
        <div className="panel-heading compact">
          <div><div className="eyebrow">{role === 'farmer' ? 'Your requests' : 'All requests'}</div><h2>{requests.length} {requests.length === 1 ? 'request' : 'requests'} in the system</h2></div>
          {role === 'farmer' && <button className="primary-button" onClick={onNewRequest}><Mic size={14} /> New request</button>}
        </div>
        <RequestList requests={requests} selectedRequestId={selectedRequest.id} onSelectRequest={onSelectRequest} authority={role === 'authority'} showAll />
      </section>
    </div>
    <div className="requests-view-detail">
      <section className="panel">
        <div className="panel-heading compact">
          <div><div className="eyebrow">Request detail</div><h2>{selectedRequest.id}</h2></div>
          <span className={`status-badge ${selectedRequest.status}`}>{selectedRequest.status === 'approved' ? 'Approved' : selectedRequest.status === 'needs_info' ? 'Needs info' : 'Under review'}</span>
        </div>
        <div className="reviewer-line"><div className="avatar small">RP</div><div><strong>Ramesh Patil</strong><span>Khed, Maharashtra · {selectedRequest.crop}</span></div></div>
        <blockquote>“{selectedRequest.request_text}”</blockquote>
        <div className="request-detail-grid">
          <div className="detail-item"><Droplets size={15} /><div><span>Water requested</span><strong>{formatLiters(selectedRequest.liters_requested)} L</strong></div></div>
          <div className="detail-item"><Leaf size={15} /><div><span>Crop & stage</span><strong>{selectedRequest.crop} · {selectedRequest.crop_stage}</strong></div></div>
          <div className="detail-item"><Zap size={15} /><div><span>Urgency</span><strong className="capitalize">{selectedRequest.urgency}</strong></div></div>
          <div className="detail-item"><Scale size={15} /><div><span>Fairness score</span><strong>{selectedRequest.fairness_score}/100</strong></div></div>
        </div>
        {role === 'authority' && <>
          <div className="recommendation">
            <div className="rec-top"><span><Sparkles size={15} /> Recommended path</span><span className="score-pill">{selectedRequest.fairness_score} fairness</span></div>
            <strong>{selectedRequest.recommendation}</strong>
            <p>Release 18,000 L now and schedule 12,000 L in the next canal window. This protects flowering stage without exceeding the current outlet balance.</p>
          </div>
          <div className="review-actions"><button className="reject-button"><X size={15} /> Request changes</button><button className="approve-button" onClick={onApprove}><Check size={15} /> Approve allocation</button></div>
          <div className="human-note"><ShieldCheck size={14} /> AI recommendation · human decision required</div>
        </>}
      </section>
      <section className="panel">
        <div className="panel-heading compact"><div><div className="eyebrow">Timeline</div><h2>Request history</h2></div><Activity size={18} className="muted-icon" /></div>
        <Timeline status={selectedRequest.status} />
      </section>
      {requestEvents.length > 0 && <section className="panel">
        <div className="panel-heading compact"><div><div className="eyebrow">Audit events</div><h2>For this request</h2></div></div>
        {requestEvents.map((event) => <div className="audit-row" key={event.id}><div className={`audit-icon ${event.event_type}`}><Activity size={14} /></div><div><strong>{event.title}</strong><span>{event.detail}</span></div><time>{formatTime(event.created_at)}</time></div>)}
      </section>}
    </div>
  </div>;
}

/* ── Intelligence View ── */

function IntelligenceView({ role }: { role: Role }) {
  const canals = [
    { name: 'Canal 1 · Main distributary', flow: 92, volume: '820,000 L', status: 'healthy', color: 'green' },
    { name: 'Canal 2 · Khed distributary', flow: 70, volume: '610,000 L', status: 'moderate', color: 'blue' },
    { name: 'Canal 3 · East branch', flow: 48, volume: '340,000 L', status: 'low', color: 'amber' },
  ];
  const reservoirs = [
    { name: 'Khadakwasla reservoir', level: 78, capacity: '1.8M L', trend: 'up' },
    { name: 'Panshet dam', level: 64, capacity: '1.2M L', trend: 'stable' },
    { name: 'Varasgaon reservoir', level: 52, capacity: '980,000 L', trend: 'down' },
  ];
  return <>
    <section className="stat-grid">
      <StatCard label="Total water available" value="2.4M L" meta="Across 3 reservoirs" icon={<Waves />} tone="aqua" />
      <StatCard label="Canal utilization" value="70%" meta="Average across 3 canals" icon={<TrendingUp />} tone="blue" />
      <StatCard label="Rainfall this week" value="42 mm" meta="12% below seasonal average" icon={<CloudRain />} tone="green" />
      <StatCard label="Demand forecast" value="3.1M L" meta="Next 7 days · 3 canals" icon={<Gauge />} tone="amber" />
    </section>
    <div className="intelligence-view-layout">
      <div className="intelligence-view-main">
        <section className="panel">
          <div className="panel-heading compact"><div><div className="eyebrow">Canal distribution</div><h2>Flow levels by canal</h2></div><button className="outline-button small"><ListFilter size={14} /> Filter</button></div>
          <div className="canal-list">
            {canals.map((canal) => (
              <div className="canal-card" key={canal.name}>
                <div className="canal-header"><Waves size={18} className={`canal-icon ${canal.color}`} /><div><strong>{canal.name}</strong><span>{canal.volume} available</span></div><span className={`flow-badge ${canal.color}`}>{canal.flow}% flow</span></div>
                <div className="chart-track"><span className={canal.color === 'green' ? '' : canal.color === 'blue' ? 'blue-fill' : 'amber-fill'} style={{ width: `${canal.flow}%` }} /></div>
                <div className="canal-footer"><span className={`status-dot ${canal.color}`} /> {canal.status === 'healthy' ? 'Operating normally' : canal.status === 'moderate' ? 'Moderate demand' : 'Low flow — attention needed'}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading compact"><div><div className="eyebrow">Demand forecast</div><h2>7-day water demand projection</h2></div></div>
          <div className="forecast-chart">
            {[
              { day: 'Mon', value: 60 }, { day: 'Tue', value: 72 }, { day: 'Wed', value: 85 },
              { day: 'Thu', value: 78 }, { day: 'Fri', value: 90 }, { day: 'Sat', value: 95 }, { day: 'Sun', value: 82 },
            ].map((bar) => (
              <div className="forecast-bar" key={bar.day}>
                <div className="forecast-bar-fill" style={{ height: `${bar.value}%` }} />
                <span>{bar.day}</span>
              </div>
            ))}
          </div>
          <div className="intelligence-alert"><TrendingUp size={16} /><span>Demand peaks Friday at 95% of canal capacity. Pre-position water reserves by Thursday.</span></div>
        </section>
      </div>
      <div className="intelligence-view-side">
        <section className="panel">
          <div className="panel-heading compact"><div><div className="eyebrow">Reservoir levels</div><h2>Storage status</h2></div></div>
          {reservoirs.map((reservoir) => (
            <div className="reservoir-row" key={reservoir.name}>
              <div className="reservoir-top"><Droplets size={16} /><strong>{reservoir.name}</strong></div>
              <div className="reservoir-bar"><span style={{ width: `${reservoir.level}%` }} /></div>
              <div className="reservoir-meta"><span>{reservoir.capacity}</span><strong>{reservoir.level}% capacity</strong></div>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading compact"><div><div className="eyebrow">Weather outlook</div><h2>Rainfall forecast</h2></div><CloudRain size={18} className="muted-icon" /></div>
          <div className="weather-grid">
            <div className="weather-day"><span>Today</span><CloudRain size={20} /><strong>42mm</strong></div>
            <div className="weather-day"><span>Tomorrow</span><CloudRain size={20} /><strong>18mm</strong></div>
            <div className="weather-day"><span>Wed</span><Droplets size={20} /><strong>6mm</strong></div>
            <div className="weather-day"><span>Thu</span><Droplets size={20} /><strong>2mm</strong></div>
          </div>
          <p className="weather-note"><Info size={13} /> Rainfall expected to drop after Tuesday. Canal flow may reduce by Thursday.</p>
        </section>
        {role === 'authority' && <section className="panel">
          <div className="panel-heading compact"><div><div className="eyebrow">AI insight</div><h2>Distribution recommendation</h2></div><Sparkles size={18} className="muted-icon" /></div>
          <div className="recommendation">
            <div className="rec-top"><span><Sparkles size={15} /> AI analysis</span><span className="score-pill">Confidence: 87%</span></div>
            <strong>Prioritize Canal 3 replenishment</strong>
            <p>Canal 3 is at 48% flow with 3 pending requests. Transfer 200,000 L from Khadakwasla reservoir by Wednesday before rainfall drops.</p>
          </div>
          <div className="human-note"><ShieldCheck size={14} /> AI recommendation · human decision required</div>
        </section>}
      </div>
    </div>
  </>;
}

/* ── Mediation View ── */

type MediationViewProps = { role: Role; requests: WaterRequest[]; onSelectRequest: (id: string) => void };
function MediationView({ role, requests, onSelectRequest }: MediationViewProps) {
  const conflicts = [
    { id: 'CNF-301', village: 'Khed', farmers: ['Ramesh Patil', 'Suresh Deshmukh'], issue: 'Both requesting from Canal 2 simultaneously', status: 'active', recommendation: 'Split allocation: 18,000 L each across two canal windows' },
    { id: 'CNF-302', village: 'Baramati', farmers: ['Mahesh Pawar', 'Anil Jadhav'], issue: 'Disputed water rights for shared outlet', status: 'mediation', recommendation: 'Refer to historical entitlement records and propose 60/40 split' },
    { id: 'CNF-303', village: 'Junnar', farmers: ['Vikram Shinde', 'Prakash Kale'], issue: 'Upstream withdrawal exceeding agreed share', status: 'review', recommendation: 'Install flow monitor and cap upstream withdrawal' },
  ];
  return <>
    <section className="stat-grid">
      <StatCard label="Active conflicts" value="3" meta="2 need mediation" icon={<AlertTriangle />} tone="red" />
      <StatCard label="In mediation" value="1" meta="Awaiting farmer response" icon={<MessageSquare />} tone="blue" />
      <StatCard label="Resolved this month" value="7" meta="100% farmer satisfaction" icon={<CheckCircle2 />} tone="green" />
      <StatCard label="Avg. resolution time" value="2.3 days" meta="0.5 days faster than last cycle" icon={<Clock3 />} tone="aqua" />
    </section>
    <div className="mediation-view-layout">
      {conflicts.map((conflict) => (
        <section className="panel mediation-card" key={conflict.id}>
          <div className="mediation-header">
            <div className={`conflict-icon ${conflict.status}`}><Scale size={18} /></div>
            <div className="mediation-title">
              <div className="eyebrow">{conflict.id} · {conflict.village}</div>
              <h2>{conflict.issue}</h2>
            </div>
            <span className={`status-badge ${conflict.status === 'active' ? 'needs_info' : conflict.status === 'mediation' ? 'under_review' : 'approved'}`}>{conflict.status === 'active' ? 'Active' : conflict.status === 'mediation' ? 'In mediation' : 'Under review'}</span>
          </div>
          <div className="mediation-farmers">
            {conflict.farmers.map((farmerName) => (
              <div className="mediation-farmer" key={farmerName}>
                <div className="avatar small">{farmerName.split(' ').map((word) => word[0]).join('')}</div>
                <div><strong>{farmerName}</strong><span>{conflict.village}, Maharashtra</span></div>
              </div>
            ))}
          </div>
          <div className="recommendation">
            <div className="rec-top"><span><Sparkles size={15} /> AI recommendation</span><span className="score-pill">Proposed</span></div>
            <strong>{conflict.recommendation}</strong>
          </div>
          {role === 'authority' && <div className="review-actions">
            <button className="reject-button"><MessageSquare size={14} /> Open dialogue</button>
            <button className="approve-button"><Check size={14} /> Accept proposal</button>
          </div>}
          <div className="human-note"><ShieldCheck size={14} /> AI recommendation · human decision required</div>
        </section>
      ))}
    </div>
  </>;
}

/* ── Audit View ── */

function AuditView({ events }: { events: AuditEvent[] }) {
  return <div className="audit-view-layout">
    <section className="panel">
      <div className="panel-heading compact">
        <div><div className="eyebrow">System activity</div><h2>{events.length} events recorded</h2></div>
        <button className="outline-button small"><ListFilter size={14} /> Filter by type</button>
      </div>
      <div className="audit-full-list">
        {events.map((event) => (
          <div className="audit-row-full" key={event.id}>
            <div className={`audit-icon ${event.event_type}`}>
              {event.event_type === 'request' ? <FileText size={14} /> : event.event_type === 'ai' ? <Sparkles size={14} /> : event.event_type === 'approval' ? <Check size={14} /> : <Activity size={14} />}
            </div>
            <div className="audit-row-content">
              <div className="audit-row-top"><strong>{event.title}</strong><span className="audit-type-badge">{event.event_type}</span></div>
              <span>{event.detail}</span>
              {event.request_id && <span className="audit-request-link">Request: {event.request_id}</span>}
            </div>
            <time>{formatDate(event.created_at)}</time>
          </div>
        ))}
        {events.length === 0 && <div className="audit-empty"><ClipboardCheck size={32} /><p>No events recorded yet. Submit a request to see activity here.</p></div>}
      </div>
    </section>
  </div>;
}

/* ── Shared Components ── */

function StatCard({ label, value, meta, icon, tone }: { label: string; value: string; meta: string; icon: React.ReactNode; tone: string }) { return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>; }
function RequestList({ requests, selectedRequestId, onSelectRequest, authority = false, showAll = false }: { requests: WaterRequest[]; selectedRequestId: string; onSelectRequest: (id: string) => void; authority?: boolean; showAll?: boolean }) { return <div className="request-list">{requests.slice(0, showAll ? undefined : authority ? 4 : 3).map((request) => <button className={`request-row ${selectedRequestId === request.id ? 'selected' : ''}`} key={request.id} onClick={() => onSelectRequest(request.id)}><div className={`request-row-icon ${request.status}`}><FileText size={16} /></div><div className="request-row-main"><strong>{request.request_text}</strong><span>{request.id} · {request.crop} · {formatTime(request.created_at)}</span></div><span className={`status-badge ${request.status}`}>{request.status === 'approved' ? 'Approved' : request.status === 'needs_info' ? 'Needs info' : 'Under review'}</span><ArrowRight size={15} className="row-arrow" /></button>)}</div>; }
function StatusCard({ request, onTrack }: { request: WaterRequest; onTrack: () => void }) { const approved = request.status === 'approved'; return <section className={`status-card ${approved ? 'approved' : ''}`}><div className="status-top"><div className="check-ring"><Check size={18} /></div><span>{approved ? 'Request approved' : 'Request under review'}</span><span className="request-number">{request.id}</span></div><h2>{approved ? 'Your water allocation is confirmed.' : 'Your request is with a water officer.'}</h2><p>{approved ? '18,000 L will be released in the next canal window, with the balance scheduled after verification.' : 'We extracted the key details and generated a recommendation. You will be notified after human review.'}</p><div className="status-card-footer"><span><Clock3 size={14} /> Updated just now</span><button onClick={onTrack}>View timeline <ArrowRight size={14} /></button></div></section>; }
function Timeline({ status }: { status: RequestStatus }) { return <div className="timeline"><div className="timeline-item done"><span className="timeline-dot"><Check size={11} /></span><div><strong>Request submitted</strong><span>Natural-language note received</span></div><time>9:41 AM</time></div><div className="timeline-item done"><span className="timeline-dot"><Check size={11} /></span><div><strong>Details extracted</strong><span>Crop and urgency confirmed</span></div><time>9:42 AM</time></div><div className={`timeline-item ${status === 'approved' ? 'done' : 'current'}`}><span className="timeline-dot">{status === 'approved' ? <Check size={11} /> : <span />}</span><div><strong>{status === 'approved' ? 'Allocation approved' : 'Human review'}</strong><span>{status === 'approved' ? 'Officer approved the recommendation' : 'A water officer is reviewing this request'}</span></div><time>{status === 'approved' ? 'Now' : 'In progress'}</time></div><div className="timeline-item"><span className="timeline-dot"><span /></span><div><strong>Water release</strong><span>Next canal window · today</span></div></div></div>; }

/* ── Login / Sign-up Page ── */

function LoginPage({ onSignedIn }: { onSignedIn: (role: Role) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<Role>('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role: selectedRole, full_name: fullName.trim() || undefined } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          onSignedIn(selectedRole);
        } else {
          setError('Account created. Please sign in with your new credentials.');
          setMode('login');
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        const storedRole = (data.user?.user_metadata as { role?: Role } | null)?.role;
        onSignedIn(storedRole === 'authority' ? 'authority' : 'farmer');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-content">
          <div className="auth-brand-row">
            <div className="brand-mark large"><Droplets size={26} strokeWidth={2.6} /></div>
            <div><strong>JalMitra</strong><span>AI water governance</span></div>
          </div>
          <h2>Responsible water allocation, governed by people.</h2>
          <p>JalMitra helps farmers request water in their own words and helps authorities review every recommendation with full transparency.</p>
          <div className="auth-features">
            <div className="auth-feature"><Leaf size={18} /><span>Farmers submit requests by voice or text</span></div>
            <div className="auth-feature"><ShieldCheck size={18} /><span>Authorities approve with AI-assisted fairness</span></div>
            <div className="auth-feature"><ClipboardCheck size={18} /><span>Every action logged for accountability</span></div>
          </div>
          <div className="auth-demo-note"><Info size={14} /> All data is synthetic for demonstration purposes.</div>
        </div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <div className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create your account'}</div>
            <h1>{mode === 'login' ? 'Sign in to JalMitra' : 'Join JalMitra'}</h1>
            <p>{mode === 'login' ? 'Choose your role and enter your credentials.' : 'Tell us who you are and create your account.'}</p>
          </div>

          <div className="role-selector">
            <button className={`role-card ${selectedRole === 'farmer' ? 'selected' : ''}`} onClick={() => setSelectedRole('farmer')} type="button">
              <div className="role-card-icon farmer"><Leaf size={22} /></div>
              <div><strong>Farmer</strong><span>Request water and track allocations</span></div>
              <div className="role-check">{selectedRole === 'farmer' && <Check size={16} />}</div>
            </button>
            <button className={`role-card ${selectedRole === 'authority' ? 'selected' : ''}`} onClick={() => setSelectedRole('authority')} type="button">
              <div className="role-card-icon authority"><ShieldCheck size={22} /></div>
              <div><strong>Authority</strong><span>Review and approve water requests</span></div>
              <div className="role-check">{selectedRole === 'authority' && <Check size={16} />}</div>
            </button>
          </div>

          <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
            {mode === 'signup' && (
              <div className="auth-field">
                <label>Full name</label>
                <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Ramesh Patil" autoComplete="name" />
              </div>
            )}
            <div className="auth-field">
              <label>Email address</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
            </div>
            {error && <div className="auth-error"><AlertTriangle size={15} /> {error}</div>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? <RefreshCw size={16} className="spin" /> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></>
            ) : (
              <><button onClick={() => { setMode('login'); setError(''); }}><ArrowLeft size={13} /> Back to sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
