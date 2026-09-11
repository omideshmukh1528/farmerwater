import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Droplets,
  FileText,
  Gauge,
  Info,
  Leaf,
  ListFilter,
  Map,
  Menu,
  Mic,
  MoreHorizontal,
  Play,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react';
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

function formatLiters(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function App() {
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
  }, []);

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
              <Icon size={17} /> <span>{label}</span>{id === 'requests' && <b>3</b>}
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
            <div className="role-switcher"><button className={role === 'farmer' ? 'selected' : ''} onClick={() => setRole('farmer')}><Leaf size={14} /> Farmer</button><button className={role === 'authority' ? 'selected' : ''} onClick={() => setRole('authority')}><ShieldCheck size={14} /> Authority</button></div>
            <button className="icon-button notification"><Bell size={18} /><span /></button>
            <div className="avatar">RP</div>
          </div>
        </header>

        <div className="page-wrap">
          <div className="page-heading">
            <div><div className="eyebrow">{role === 'farmer' ? 'Farmer portal · Khed, Maharashtra' : 'District command center · Nashik division'}</div><h1>{role === 'farmer' ? 'Good morning, Ramesh.' : 'Good morning, Authority.'}</h1><p>{role === 'farmer' ? 'Here is your water allocation at a glance.' : 'Review recommendations, spot conflicts, and keep allocations fair.'}</p></div>
            <div className="heading-actions"><span className="live-status"><span className="pulse-dot" /> System operational</span><button className="outline-button"><RefreshCw size={15} /> Refresh</button></div>
          </div>

          {role === 'farmer' ? (
            <FarmerPortal farmer={farmer} remainingLiters={remainingLiters} allocationPercent={allocationPercent} requests={requests} selectedRequest={selectedRequest} submittedRequest={submittedRequest} onNewRequest={() => setComposerOpen(true)} onSelectRequest={setSelectedRequestId} onTrack={() => { setView('requests'); setToast('Showing your request timeline.'); }} />
          ) : (
            <AuthorityCenter requests={requests} selectedRequest={selectedRequest} events={events} onSelectRequest={setSelectedRequestId} onApprove={approveRequest} onOpenMediation={() => setView('mediation')} />
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

type AuthorityProps = { requests: WaterRequest[]; selectedRequest: WaterRequest; events: AuditEvent[]; onSelectRequest: (id: string) => void; onApprove: () => void; onOpenMediation: () => void };
function AuthorityCenter({ requests, selectedRequest, events, onSelectRequest, onApprove, onOpenMediation }: AuthorityProps) {
  return <><section className="stat-grid authority-stats"><StatCard label="Open requests" value="18" meta="3 high priority" icon={<FileText />} tone="blue" /><StatCard label="Water in system" value="2.4M L" meta="Across 6 outlets" icon={<Waves />} tone="aqua" /><StatCard label="Potential conflicts" value="3" meta="Needs verification" icon={<AlertTriangle />} tone="red" /><StatCard label="Avg. response SLA" value="1h 42m" meta="18m ahead of target" icon={<Clock3 />} tone="green" /></section><div className="authority-layout"><div className="authority-main"><section className="panel queue-panel"><div className="panel-heading compact"><div><div className="eyebrow">Review queue</div><h2>Requests needing attention</h2></div><div className="filter-actions"><button className="outline-button small"><ListFilter size={14} /> Filter</button><button className="icon-button small"><Search size={16} /></button></div></div><RequestList requests={requests} selectedRequestId={selectedRequest.id} onSelectRequest={onSelectRequest} authority /></section><section className="panel conflict-panel"><div className="panel-heading compact"><div><div className="eyebrow">Water intelligence</div><h2>Distribution health</h2></div><button className="link-button" onClick={onOpenMediation}>Open intelligence <ArrowRight size={14} /></button></div><div className="mini-chart"><div className="chart-labels"><span>Canal 1</span><strong>92%</strong></div><div className="chart-track"><span style={{ width: '92%' }} /></div><div className="chart-labels"><span>Canal 2</span><strong>70%</strong></div><div className="chart-track"><span className="blue-fill" style={{ width: '70%' }} /></div><div className="chart-labels"><span>Canal 3</span><strong>48%</strong></div><div className="chart-track"><span className="amber-fill" style={{ width: '48%' }} /></div></div><div className="intelligence-alert"><AlertTriangle size={16} /><span>Canal 3 has 3 requests above available flow. Review recommended before next release.</span><ArrowRight size={15} /></div></section></div><aside className="authority-side"><section className="panel review-panel"><div className="panel-heading compact"><div><div className="eyebrow">Mediation center</div><h2>Review recommendation</h2></div><span className="review-id">{selectedRequest.id}</span></div><div className="reviewer-line"><div className="avatar small">RP</div><div><strong>Ramesh Patil</strong><span>Khed, Maharashtra · Soybean</span></div><span className="priority-badge">High priority</span></div><blockquote>“{selectedRequest.request_text}”</blockquote><div className="recommendation"><div className="rec-top"><span><Sparkles size={15} /> Recommended path</span><span className="score-pill">92 fairness</span></div><strong>{selectedRequest.recommendation}</strong><p>Release 18,000 L now and schedule 12,000 L in the next canal window. This protects flowering stage without exceeding the current outlet balance.</p></div><button className="explain-button"><CircleHelp size={15} /> Why this recommendation? <ArrowRight size={14} /></button><div className="review-actions"><button className="reject-button"><X size={15} /> Request changes</button><button className="approve-button" onClick={onApprove}><Check size={15} /> Approve allocation</button></div><div className="human-note"><ShieldCheck size={14} /> AI recommendation · human decision required</div></section><section className="panel audit-mini"><div className="panel-heading compact"><div><div className="eyebrow">Audit trail</div><h2>Latest activity</h2></div><button className="more-button"><MoreHorizontal size={18} /></button></div>{events.slice(0, 3).map((event) => <div className="audit-row" key={event.id}><div className={`audit-icon ${event.event_type}`}><Activity size={14} /></div><div><strong>{event.title}</strong><span>{event.detail}</span></div><time>{formatTime(event.created_at)}</time></div>)}</section></aside></div></>;
}

function StatCard({ label, value, meta, icon, tone }: { label: string; value: string; meta: string; icon: React.ReactNode; tone: string }) { return <div className={`stat-card ${tone}`}><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>; }
function RequestList({ requests, selectedRequestId, onSelectRequest, authority = false }: { requests: WaterRequest[]; selectedRequestId: string; onSelectRequest: (id: string) => void; authority?: boolean }) { return <div className="request-list">{requests.slice(0, authority ? 4 : 3).map((request) => <button className={`request-row ${selectedRequestId === request.id ? 'selected' : ''}`} key={request.id} onClick={() => onSelectRequest(request.id)}><div className={`request-row-icon ${request.status}`}><FileText size={16} /></div><div className="request-row-main"><strong>{request.request_text}</strong><span>{request.id} · {request.crop} · {formatTime(request.created_at)}</span></div><span className={`status-badge ${request.status}`}>{request.status === 'approved' ? 'Approved' : request.status === 'needs_info' ? 'Needs info' : 'Under review'}</span><ArrowRight size={15} className="row-arrow" /></button>)}</div>; }
function StatusCard({ request, onTrack }: { request: WaterRequest; onTrack: () => void }) { const approved = request.status === 'approved'; return <section className={`status-card ${approved ? 'approved' : ''}`}><div className="status-top"><div className="check-ring"><Check size={18} /></div><span>{approved ? 'Request approved' : 'Request under review'}</span><span className="request-number">{request.id}</span></div><h2>{approved ? 'Your water allocation is confirmed.' : 'Your request is with a water officer.'}</h2><p>{approved ? '18,000 L will be released in the next canal window, with the balance scheduled after verification.' : 'We extracted the key details and generated a recommendation. You will be notified after human review.'}</p><div className="status-card-footer"><span><Clock3 size={14} /> Updated just now</span><button onClick={onTrack}>View timeline <ArrowRight size={14} /></button></div></section>; }
function Timeline({ status }: { status: RequestStatus }) { return <div className="timeline"><div className="timeline-item done"><span className="timeline-dot"><Check size={11} /></span><div><strong>Request submitted</strong><span>Natural-language note received</span></div><time>9:41 AM</time></div><div className="timeline-item done"><span className="timeline-dot"><Check size={11} /></span><div><strong>Details extracted</strong><span>Crop and urgency confirmed</span></div><time>9:42 AM</time></div><div className={`timeline-item ${status === 'approved' ? 'done' : 'current'}`}><span className="timeline-dot">{status === 'approved' ? <Check size={11} /> : <span />}</span><div><strong>{status === 'approved' ? 'Allocation approved' : 'Human review'}</strong><span>{status === 'approved' ? 'Officer approved the recommendation' : 'A water officer is reviewing this request'}</span></div><time>{status === 'approved' ? 'Now' : 'In progress'}</time></div><div className="timeline-item"><span className="timeline-dot"><span /></span><div><strong>Water release</strong><span>Next canal window · today</span></div></div></div>; }

export default App;
