import { useAuth } from "@/_core/hooks/useAuth";
import { AuthDialog } from "@/components/AuthDialog";
import { RequestTrackingDialog } from "@/components/RequestTrackingDialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  Bolt,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Droplets,
  Hammer,
  Handshake,
  IndianRupee,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Paintbrush,
  PanelLeft,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Star,
  TrendingUp,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const iconMap: Record<string, any> = { bolt: Bolt, droplets: Droplets, hammer: Hammer, sparkles: Sparkles, wrench: Wrench, leaf: Leaf, sprout: Sprout, paintbrush: Paintbrush };
const accentMap: Record<string, string> = {
  amber: "bg-[#fff1bf] text-[#a66b00]",
  sky: "bg-[#dff4ff] text-[#157fa6]",
  orange: "bg-[#ffe6d5] text-[#c45d20]",
  violet: "bg-[#eee6ff] text-[#7750c7]",
  rose: "bg-[#ffe1e8] text-[#bd4b6a]",
  emerald: "bg-[#dff7e8] text-[#198653]",
  lime: "bg-[#ebf8c9] text-[#5e830d]",
  fuchsia: "bg-[#f9e0fb] text-[#a840aa]",
};

const navItems = [
  { label: "Overview", icon: PanelLeft },
  { label: "Find a service", icon: Search },
  { label: "My requests", icon: BriefcaseBusiness },
  { label: "Messages", icon: Bell },
];

const fallbackStats = { activeWorkers: 128, verifiedWorkers: 112, openRequests: 46, completedJobs: 864, monthlyVolume: 284000, satisfaction: 4.8, pendingVerifications: 7 };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [view, setView] = useState<"customer" | "worker" | "cooperative">("customer");
  const [activeNav, setActiveNav] = useState("Overview");
  const [showRequest, setShowRequest] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [trackingRequestId, setTrackingRequestId] = useState<number | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const categoriesQuery = trpc.marketplace.categories.useQuery();
  const workersQuery = trpc.marketplace.workers.useQuery({});
  const analyticsQuery = trpc.marketplace.analytics.useQuery();
  const requestsQuery = trpc.dashboard.requests.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: isAuthenticated ? 10000 : false });
  const workerStatsQuery = trpc.dashboard.workerStats.useQuery(undefined, { enabled: isAuthenticated && view === "worker" });
  useEffect(() => {
    if (!user) return;
    setView(user.userType === "worker" ? "worker" : user.userType === "cooperative" || user.role === "admin" ? "cooperative" : "customer");
  }, [user?.userType, user?.role]);
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: () => { toast.success("Request sent — we’re finding the right local expert."); setShowRequest(false); requestsQuery.refetch(); },
    onError: (error) => toast.error(error.message || "Could not create request"),
  });
  const acceptRequest = trpc.requests.accept.useMutation({
    onSuccess: async () => { toast.success("Request accepted"); await Promise.all([requestsQuery.refetch(), workerStatsQuery.refetch()]); },
    onError: (error) => toast.error(error.message),
  });
  const startJob = trpc.workers.startJob.useMutation({
    onSuccess: () => { toast.success("Job started; your live location is now shared with this customer."); requestsQuery.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const availabilityMutation = trpc.workers.setAvailability.useMutation({ onSuccess: async (data) => { toast.success(data.available ? "You’re now available for new work" : "Availability paused"); await workerStatsQuery.refetch(); }, onError: (error) => toast.error(error.message) });
  const updateStatus = trpc.requests.updateStatus.useMutation({ onSuccess: async () => { toast.success("Request updated"); await Promise.all([requestsQuery.refetch(), workerStatsQuery.refetch()]); }, onError: (error) => toast.error(error.message) });

  const categories = categoriesQuery.data ?? [];
  const workers = workersQuery.data ?? [];
  const stats = analyticsQuery.data ?? fallbackStats;
  const workerStats = workerStatsQuery.data;
  const currentProfile = workerStats?.profile ?? workers[0];

  const handleProtectedAction = (action: () => void) => {
    if (!isAuthenticated) { toast("Sign in to continue", { description: "Sign in or create an account to manage your requests." }); setShowAuth(true); return; }
    action();
  };

  const navClick = (label: string) => {
    setActiveNav(label);
    setShowMobileNav(false);
    if (label === "Find a service") document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
    if (label === "My requests") document.getElementById("requests")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) return <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center text-sm text-[#63706a]">Preparing your cooperative workspace…</div>;

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#18221e] selection:bg-[#c9edcf]">
      <aside className={`fixed inset-y-0 left-0 z-50 w-[252px] border-r border-[#dfe9e1] bg-[#fbfdfb] px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${showMobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="brand-mark"><Handshake className="h-5 w-5" /></div>
          <div><div className="font-extrabold tracking-[-0.04em] text-[17px]">Co-opLink</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789080]">Local skills, trusted</div></div>
          <button className="ml-auto lg:hidden text-[#789080]" onClick={() => setShowMobileNav(false)} aria-label="Close navigation"><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c9c92]">Workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => <button key={item.label} onClick={() => navClick(item.label)} className={`side-nav-item ${activeNav === item.label ? "is-active" : ""}`}><item.icon className="h-[17px] w-[17px]" />{item.label}{item.label === "Messages" && <span className="ml-auto badge-dot" />}</button>)}
        </nav>
        <div className="mt-8 mb-5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8c9c92]">Account</div>
        <nav className="space-y-1">
          <button className="side-nav-item" onClick={() => toast("Profile settings are ready for your next edit") }><Users className="h-[17px] w-[17px]" />My profile</button>
          <button className="side-nav-item" onClick={() => toast("Settings panel coming next") }><Settings className="h-[17px] w-[17px]" />Settings</button>
          <button className="side-nav-item" onClick={() => toast("Help center coming next") }><CircleHelp className="h-[17px] w-[17px]" />Help center</button>
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-2xl bg-[#edf7ed] p-4">
          <div className="flex items-center gap-2 text-[#2c7040] text-xs font-bold"><ShieldCheck className="h-4 w-4" />Verified cooperative</div>
          <p className="mt-2 text-[11px] leading-4 text-[#68806d]">Every expert is reviewed by the community before they go live.</p>
        </div>
      </aside>
      {showMobileNav && <button className="fixed inset-0 z-40 bg-[#173022]/25 lg:hidden" onClick={() => setShowMobileNav(false)} aria-label="Close navigation overlay" />}

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e1ebe3] bg-[#f7faf7]/90 px-5 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3"><button className="icon-button lg:hidden" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button><div><div className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a9b90] sm:block">{view === "customer" ? "Customer workspace" : view === "worker" ? "Worker workspace" : "Cooperative console"}</div><div className="font-bold tracking-[-0.02em]">Good morning{user?.name ? `, ${user.name.split(" ")[0]}` : ""} <span className="wave">✦</span></div></div></div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 rounded-xl border border-[#dce8df] bg-white p-1 sm:flex">
              {(["customer", "worker", "cooperative"] as const).map((role) => <button key={role} onClick={() => setView(role)} className={`role-switch ${view === role ? "is-active" : ""}`}>{role === "customer" ? "Customer" : role === "worker" ? "Worker" : "Co-op"}</button>)}
            </div>
            <button className="icon-button" onClick={() => toast("You’re all caught up", { description: "No new notifications." })} aria-label="Notifications"><Bell className="h-[18px] w-[18px]" /><span className="notification-dot" /></button>
            <div className="h-8 w-px bg-[#e0e9e2]" />
            {isAuthenticated ? <button className="flex items-center gap-2" onClick={() => logout()} title="Sign out"><div className="avatar avatar-sm">{initials(user?.name || "Co Op")}</div><div className="hidden text-left sm:block"><div className="text-xs font-bold">{user?.name || "Member"}</div><div className="text-[10px] text-[#8a9b90]">Sign out</div></div><LogOut className="hidden h-3.5 w-3.5 text-[#93a197] sm:block" /></button> : <button onClick={() => setShowAuth(true)} className="button button-compact">Sign in <ArrowRight className="h-3.5 w-3.5" /></button>}
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8">
          {view === "customer" && <CustomerView categories={categories} workers={workers} requests={requestsQuery.data ?? []} onRequest={() => handleProtectedAction(() => setShowRequest(true))} onSelectWorker={(worker) => setSelectedWorker(worker)} onTrack={(id) => setTrackingRequestId(id)} />}
          {view === "worker" && <WorkerView stats={workerStats ?? { profile: currentProfile, earnings: 0, pending: 0, completed: 0, responseRate: 0 }} requests={requestsQuery.data ?? []} onAvailability={(available) => handleProtectedAction(() => availabilityMutation.mutate({ available }))} onAccept={(id) => acceptRequest.mutate({ id: Number(id) })} onStart={(id, location) => startJob.mutate({ id: Number(id), ...location })} onComplete={(id) => updateStatus.mutate({ id: Number(id), status: "completed" })} onCancel={(id) => updateStatus.mutate({ id: Number(id), status: "cancelled" })} />}
          {view === "cooperative" && <CooperativeView stats={stats} workers={workers} />}
        </main>
      </div>

      {showRequest && <RequestDialog categories={categories} onClose={() => setShowRequest(false)} onSubmit={(data) => createRequest.mutate(data)} isPending={createRequest.isPending} />}
      {selectedWorker && <WorkerDialog worker={selectedWorker} onClose={() => setSelectedWorker(null)} onRequest={() => { setSelectedWorker(null); handleProtectedAction(() => setShowRequest(true)); }} />}
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      <RequestTrackingDialog requestId={trackingRequestId} onOpenChange={(open) => { if (!open) setTrackingRequestId(null); }} />
    </div>
  );
}

function CustomerView({ categories, workers, requests, onRequest, onSelectWorker, onTrack }: { categories: any[]; workers: any[]; requests: any[]; onRequest: () => void; onSelectWorker: (worker: any) => void; onTrack: (id: number) => void }) {
  const [category, setCategory] = useState<string | undefined>();
  const visibleWorkers = category ? workers.filter((worker) => worker.category.toLowerCase() === category.toLowerCase()) : workers;
  return <>
    <section className="hero-grid fade-up">
      <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" />FROM LOCAL SKILLS → TRUSTED SERVICES</div><h1>Help is closer<br /><span>than you think.</span></h1><p>Book trusted neighborhood experts for the moments that matter — from a dripping tap to a thriving community garden.</p><button className="button button-primary mt-7" onClick={onRequest}>Request a service <ArrowRight className="h-4 w-4" /></button><div className="hero-proof"><div className="avatar-stack"><div className="avatar avatar-sm bg-[#d7f0d8]">AK</div><div className="avatar avatar-sm bg-[#f8e8cd]">MS</div><div className="avatar avatar-sm bg-[#e1ddf8]">RJ</div><div className="avatar avatar-sm bg-[#d8eefa]">+1k</div></div><span>Trusted by <strong>1,200+</strong> households in Pune</span></div></div>
      <div className="hero-visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-node node-center"><Handshake className="h-7 w-7" /></div><div className="hero-node node-one"><Bolt className="h-4 w-4" /></div><div className="hero-node node-two"><Droplets className="h-4 w-4" /></div><div className="hero-node node-three"><Leaf className="h-4 w-4" /></div><div className="hero-card card-top"><span className="tiny-label">NETWORK HEALTH</span><div className="flex items-end justify-between mt-2"><strong>98.4%</strong><span className="trend-up">+4.8%</span></div><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div><div className="hero-card card-bottom"><div className="pulse-dot" /><span>126 experts online</span><ChevronDown className="ml-auto h-3.5 w-3.5 rotate-[-90deg] text-[#7e9b83]" /></div><div className="hero-label label-left">LOCAL EXPERTS</div><div className="hero-label label-right">COMMUNITY FIRST</div></div>
    </section>

    <section className="section-block" id="services"><div className="section-heading"><div><div className="eyebrow">BROWSE SERVICES</div><h2>What can we help with?</h2></div><button className="text-link" onClick={() => toast("All categories are shown here for the MVP")}>View all <ArrowRight className="h-3.5 w-3.5" /></button></div><div className="category-grid">{categories.slice(0, 8).map((category, index) => { const Icon = iconMap[category.icon] ?? Wrench; return <button key={category.id} onClick={() => setCategory(category.name)} className={`category-card ${category.name === category ? "selected" : ""}`}><div className={`category-icon ${accentMap[category.accent] || "bg-[#edf3ee] text-[#54715b]"}`}><Icon className="h-[19px] w-[19px]" /></div><div className="text-left"><div className="font-bold text-[13px]">{category.name}</div><div className="mt-1 text-[11px] leading-4 text-[#839187]">{category.description}</div></div><ArrowRight className="ml-auto h-4 w-4 text-[#a4b2a6] transition-transform group-hover:translate-x-0.5" /></button> })}</div></section>

    <section className="section-block" id="experts"><div className="section-heading"><div><div className="eyebrow">NEARBY EXPERTS</div><h2>People who can help today</h2></div><button className="text-link" onClick={() => toast("Map view is ready for Google Maps key configuration")}>Explore map <MapPin className="h-3.5 w-3.5" /></button></div><div className="experts-grid">{visibleWorkers.slice(0, 4).map((worker) => <button key={worker.id} onClick={() => onSelectWorker(worker)} className="expert-card"><div className="flex items-start justify-between"><div className={`avatar avatar-lg ${worker.id % 2 === 0 ? "bg-[#fbe7ce]" : "bg-[#dcefdc]"}`}>{initials(worker.displayName)}</div><span className={`availability ${worker.available ? "online" : "offline"}`}>{worker.available ? "Available" : "Busy"}</span></div><div className="mt-4 flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#efa92a] text-[#efa92a]" /><span className="font-bold text-xs">{(worker.rating / 100).toFixed(1)}</span><span className="text-[11px] text-[#91a096]">({worker.totalJobs} jobs)</span></div><div className="mt-2 text-left"><div className="font-bold text-[14px]">{worker.displayName}</div><div className="mt-1 text-[11px] text-[#789080]">{worker.category} · {worker.neighborhood}</div></div><div className="mt-4 flex items-center justify-between border-t border-[#edf1ed] pt-3 text-[11px]"><span className="flex items-center gap-1 text-[#8b9b90]"><MapPin className="h-3 w-3" /> Within 2.4 km</span><span className="font-bold text-[#357347]">From ₹{worker.hourlyRate}</span></div></button>)}</div></section>

    <section className="split-section" id="requests"><div className="requests-panel"><div className="section-heading"><div><div className="eyebrow">YOUR ACTIVITY</div><h2>Recent requests</h2></div><button className="icon-button" onClick={onRequest} aria-label="Create request"><Plus className="h-4 w-4" /></button></div>{requests.length ? <div className="request-list">{requests.slice(0, 3).map((request: any) => <div className="request-row" key={request.id}><div className="request-icon"><Wrench className="h-4 w-4" /></div><div className="min-w-0 flex-1 text-left"><div className="truncate text-xs font-bold">{request.serviceName}</div><div className="mt-1 truncate text-[11px] text-[#8a9b90]">{request.address} · {request.preferredDate}</div></div><span className={`status-pill ${request.status}`}>{String(request.status).replace("_", " ")}</span>{request.status === "in_progress" && <button className="button button-small button-primary" onClick={() => onTrack(request.id)}>Track worker</button>}</div>)}</div> : <div className="empty-state"><BriefcaseBusiness className="h-5 w-5" /><p>No saved requests yet.</p><button className="text-link" onClick={onRequest}>Start your first request</button></div>}</div><div className="trust-panel"><div className="eyebrow text-[#bbebc1]">THE CO-OP DIFFERENCE</div><h3>Built by the community,<br />for the community.</h3><p>Every booking strengthens local livelihoods. Every review makes the network better.</p><div className="trust-line"><div className="trust-icon"><ShieldCheck className="h-4 w-4" /></div><div><strong>Verified skills</strong><span>Certificate-backed profiles</span></div></div><div className="trust-line"><div className="trust-icon"><IndianRupee className="h-4 w-4" /></div><div><strong>Fair earnings</strong><span>Transparent pricing, no middlemen</span></div></div><div className="trust-line"><div className="trust-icon"><Users className="h-4 w-4" /></div><div><strong>Local impact</strong><span>126 experts earning today</span></div></div></div></section>
  </>;
}

function WorkerView({ stats, requests, onAvailability, onAccept, onStart, onComplete, onCancel }: {
  stats: any;
  requests: any[];
  onAvailability: (available: boolean) => void;
  onAccept: (id: number) => void;
  onStart: (id: number, location: { latitude: number; longitude: number; accuracy: number }) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const profile = stats.profile;
  const [available, setAvailable] = useState(Boolean(profile?.available));
  const [locationError, setLocationError] = useState("");
  const lastLocationSent = useRef(0);
  const activeJob = requests.find((request: any) => request.status === "in_progress");
  const locationMutation = trpc.workers.updateLocation.useMutation({
    onError: (error) => setLocationError(error.message),
  });

  useEffect(() => setAvailable(Boolean(profile?.available)), [profile?.available]);

  useEffect(() => {
    if (!activeJob || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition((position) => {
      const now = Date.now();
      if (now - lastLocationSent.current < 10000) return;
      lastLocationSent.current = now;
      locationMutation.mutate({
        id: Number(activeJob.id),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    }, (error) => {
      setLocationError(error.message || "Location sharing was stopped. The customer will see the last update.");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeJob?.id, locationMutation.mutate]);

  const toggle = () => {
    const next = !available;
    onAvailability(next);
  };

  const requestStart = (id: number) => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location sharing.");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      onStart(id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    }, (error) => {
      setLocationError(error.message || "Allow location access to start a tracked job.");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  };

  return <>
    <section className="worker-hero fade-up"><div><div className="eyebrow"><span className="eyebrow-line" />YOUR WORKSPACE</div><h1>Make your skills<br /><span>work for you.</span></h1><p>Manage your requests, stay visible to your community, and grow your independent livelihood.</p><div className="flex flex-wrap gap-3 mt-7"><button className={`button ${available ? "button-primary" : "button-muted"}`} onClick={toggle}><span className={`pulse-dot ${available ? "" : "is-off"}`} />{available ? "Available for work" : "Availability paused"}</button><button className="button button-ghost" onClick={() => toast("Profile editing is next in your workspace")}>Edit profile <Settings className="h-4 w-4" /></button></div></div><div className="worker-profile-card"><div className="avatar avatar-xl bg-[#d8efda]">{initials(profile?.displayName || "Worker")}</div><div className="mt-4 flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#efa92a] text-[#efa92a]" /><b>{((profile?.rating ?? 0) / 100).toFixed(1)}</b><span className="text-xs text-[#839187]">· {profile?.totalJobs ?? 0} jobs</span></div><h3 className="mt-2 font-bold">{profile?.displayName || "Your worker profile"}</h3><div className="mt-1 text-xs text-[#789080]">{profile?.category || "Service provider"} · {profile?.neighborhood || "Pune"}</div>{profile?.verified ? <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#e8f7e9] px-2.5 py-1 text-[10px] font-bold text-[#367d45]"><ShieldCheck className="h-3 w-3" /> Verified profile</span> : <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#fff4cf] px-2.5 py-1 text-[10px] font-bold text-[#8a6418]">Verification pending</span>}</div></section>
    <section className="metrics-grid"><Metric icon={IndianRupee} label="This month" value={`₹${formatCurrency(stats.earnings ?? 0)}`} delta="Current earnings" /><Metric icon={Clock3} label="Open requests" value={String(requests.filter((request: any) => request.status === "open").length)} delta="Available to accept" warm /><Metric icon={Check} label="Completed jobs" value={String(stats.completed ?? 0)} delta="All-time" /><Metric icon={TrendingUp} label="Response rate" value={`${stats.responseRate ?? 0}%`} delta="Based on completed work" /></section>
    <section className="section-block"><div className="section-heading"><div><div className="eyebrow">JOB BOARD</div><h2>Requests for you</h2></div><span className="text-xs text-[#819087]">Open requests can be claimed by one worker</span></div>
      {locationError && <p role="alert" className="mb-4 rounded-md bg-[#fff1e5] px-4 py-3 text-sm text-[#8a4f1c]">{locationError}</p>}
      {requests.length === 0 ? <div className="empty-state rounded-md border border-dashed border-[#dce8df]"><BriefcaseBusiness className="h-5 w-5" /><p>No requests are available for your profile yet.</p></div> : <div className="worker-requests">{requests.map((job: any) => <div className="worker-request-card" key={job.id}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="request-id">#{job.id}</span><span className={`status-pill ${job.status}`}>{String(job.status).replace("_", " ")}</span></div><h3 className="mt-3 text-[15px] font-bold">{job.serviceName}</h3><p className="mt-1 text-xs text-[#7d8c81]">{job.description}</p></div><div className="text-right"><div className="text-[16px] font-extrabold text-[#2c7040]">₹{job.budget ?? "Negotiable"}</div><div className="mt-1 text-[10px] text-[#91a096]">estimated budget</div></div></div><div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#edf1ed] pt-3 text-[11px] text-[#7d8c81]"><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.address}</span><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{job.preferredDate} · {job.preferredTime}</span><div className="ml-auto flex gap-2">{job.status === "open" && <button className="button button-small button-primary" onClick={() => onAccept(Number(job.id))}>Accept request</button>}{job.status === "accepted" && <><button className="button button-small button-primary" onClick={() => requestStart(Number(job.id))}>Start job & share location</button><button className="button button-small button-ghost" onClick={() => onCancel(Number(job.id))}>Cancel</button></>}{job.status === "in_progress" && <button className="button button-small button-primary" onClick={() => onComplete(Number(job.id))}>Mark complete</button>}</div></div></div>)}</div>}
    </section>
  </>;
}

function Metric({ icon: Icon, label, value, delta, warm }: { icon: any; label: string; value: string; delta: string; warm?: boolean }) { return <div className="metric-card"><div className={`metric-icon ${warm ? "warm" : ""}`}><Icon className="h-[17px] w-[17px]" /></div><div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9b90]">{label}</div><div className="mt-1 flex items-end justify-between"><strong className="text-[23px] tracking-[-0.04em]">{value}</strong><span className={warm ? "text-[#a36c24]" : "text-[#43834c]"}>{delta}</span></div></div> }

function CooperativeView({ stats, workers }: { stats: any; workers: any[] }) { return <>
  <section className="coop-hero fade-up"><div><div className="eyebrow"><span className="eyebrow-line" />COOPERATIVE CONSOLE</div><h1>See the network<br /><span>in motion.</span></h1><p>One calm view of your local service ecosystem — workers, demand, and impact.</p><div className="flex gap-3 mt-7"><button className="button button-primary" onClick={() => toast("Verification queue opened")}>Review verifications <ArrowRight className="h-4 w-4" /></button><button className="button button-ghost" onClick={() => toast("Analytics export prepared")}>Export report</button></div></div><div className="network-visual"><div className="network-ring ring-a" /><div className="network-ring ring-b" /><div className="network-core"><Handshake className="h-8 w-8" /></div><div className="network-node n-a"><Users className="h-4 w-4" /><span>128 workers</span></div><div className="network-node n-b"><BriefcaseBusiness className="h-4 w-4" /><span>46 requests</span></div><div className="network-node n-c"><IndianRupee className="h-4 w-4" /><span>₹2.8L volume</span></div></div></section>
  <section className="metrics-grid"><Metric icon={Users} label="Active workers" value={String(stats.activeWorkers)} delta={`${stats.verifiedWorkers} verified`} /><Metric icon={BriefcaseBusiness} label="Open requests" value={String(stats.openRequests)} delta="Across 8 categories" warm /><Metric icon={Check} label="Completed jobs" value={String(stats.completedJobs)} delta="+14.6% this month" /><Metric icon={IndianRupee} label="Monthly volume" value={`₹${formatCurrency(stats.monthlyVolume)}`} delta="+22.4%" /></section>
  <section className="split-section"><div className="requests-panel"><div className="section-heading"><div><div className="eyebrow">PEOPLE OF THE CO-OP</div><h2>Worker directory</h2></div><button className="icon-button" onClick={() => toast("Invite flow opened")}><Plus className="h-4 w-4" /></button></div><div className="directory-list">{workers.slice(0, 4).map((worker) => <div className="directory-row" key={worker.id}><div className={`avatar avatar-sm ${worker.id % 2 === 0 ? "bg-[#fbe7ce]" : "bg-[#dcefdc]"}`}>{initials(worker.displayName)}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{worker.displayName}</div><div className="mt-0.5 text-[11px] text-[#8a9b90]">{worker.category} · {worker.neighborhood}</div></div><span className="flex items-center gap-1 text-[11px] font-semibold"><Star className="h-3 w-3 fill-[#efa92a] text-[#efa92a]" />{(worker.rating / 100).toFixed(1)}</span><span className={`availability ${worker.available ? "online" : "offline"}`}>{worker.available ? "Live" : "Away"}</span><MoreHorizontal className="h-4 w-4 text-[#a7b2a9]" /></div>)}</div></div><div className="impact-panel"><div className="eyebrow text-[#bbebc1]">THIS MONTH’S IMPACT</div><h3>When local skills<br />stay local, everyone wins.</h3><div className="impact-number">₹{formatCurrency(stats.monthlyVolume)}</div><p>paid directly to workers through the co-op network</p><div className="impact-chart"><i style={{ height: "34%" }} /><i style={{ height: "48%" }} /><i style={{ height: "42%" }} /><i style={{ height: "61%" }} /><i style={{ height: "57%" }} /><i style={{ height: "74%" }} /><i style={{ height: "91%" }} /></div><div className="impact-labels"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Now</span></div></div></section>
</> }

function RequestDialog({ categories, onClose, onSubmit, isPending }: { categories: any[]; onClose: () => void; onSubmit: (data: any) => void; isPending: boolean }) { const [service, setService] = useState(categories[0]?.name || "Electrical"); const [description, setDescription] = useState(""); const [address, setAddress] = useState("Kothrud, Pune"); const [date, setDate] = useState("Today"); const [time, setTime] = useState("4:00 PM"); const [budget, setBudget] = useState("850"); const submit = (event: React.FormEvent) => { event.preventDefault(); onSubmit({ serviceName: service, description, address, preferredDate: date, preferredTime: time, budget: Number(budget) || undefined, categoryId: categories.find((item) => item.name === service)?.id }); }; return <div className="modal-backdrop"><form className="modal-card" onSubmit={submit}><div className="flex items-start justify-between"><div><div className="eyebrow">NEW SERVICE REQUEST</div><h2 className="mt-2">Tell us what you need</h2><p className="mt-1 text-xs text-[#819087]">We’ll match you with trusted experts nearby.</p></div><button type="button" className="icon-button" onClick={onClose}><X className="h-4 w-4" /></button></div><div className="form-grid"><label>Service<select value={service} onChange={(e) => setService(e.target.value)}>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label>Budget (₹)<input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} /></label><label className="form-span">What needs doing?<textarea required minLength={8} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Ceiling fan is making a buzzing sound…" /></label><label className="form-span">Location<input required value={address} onChange={(e) => setAddress(e.target.value)} /></label><label>Date<select value={date} onChange={(e) => setDate(e.target.value)}><option>Today</option><option>Tomorrow</option><option>Sep 29</option><option>Sep 30</option></select></label><label>Preferred time<select value={time} onChange={(e) => setTime(e.target.value)}><option>10:00 AM</option><option>2:00 PM</option><option>4:00 PM</option><option>6:00 PM</option></select></label></div><div className="flex justify-end gap-2 mt-6"><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={isPending}>{isPending ? "Sending…" : "Find my expert"}<ArrowRight className="h-4 w-4" /></button></div></form></div> }

function WorkerDialog({ worker, onClose, onRequest }: { worker: any; onClose: () => void; onRequest: () => void }) { return <div className="modal-backdrop"><div className="modal-card max-w-[460px]"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="avatar avatar-lg bg-[#dcefdc]">{initials(worker.displayName)}</div><div><div className="flex items-center gap-1"><h2>{worker.displayName}</h2><ShieldCheck className="h-4 w-4 text-[#3d8a4e]" /></div><div className="mt-1 text-xs text-[#819087]">{worker.category} · {worker.neighborhood}</div></div></div><button className="icon-button" onClick={onClose}><X className="h-4 w-4" /></button></div><div className="profile-stats"><div><Star className="h-4 w-4 fill-[#efa92a] text-[#efa92a]" /><strong>{(worker.rating / 100).toFixed(1)}</strong><span>rating</span></div><div><Check className="h-4 w-4 text-[#3d8a4e]" /><strong>{worker.totalJobs}</strong><span>jobs done</span></div><div><IndianRupee className="h-4 w-4 text-[#3d8a4e]" /><strong>{worker.hourlyRate}</strong><span>starting from</span></div></div><p className="mt-5 text-sm leading-6 text-[#65766b]">{worker.bio}</p><div className="mt-5 flex flex-wrap gap-2">{(worker.skills || "Rewiring, Fans, MCBs").split(",").map((skill: string) => <span className="skill-chip" key={skill}>{skill.trim()}</span>)}</div><button className="button button-primary w-full mt-6" onClick={onRequest}>Request this expert <ArrowRight className="h-4 w-4" /></button></div></div> }
