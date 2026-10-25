import { useState, useEffect } from "react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  LogOut,
  Menu,
  Plus,
  Search,
  X,
  AlertCircle,
  Building2,
  LoaderCircle,
  Download,
  Package,
  Wallet,
} from "lucide-react";
import { api, exportCSV } from "./api";
import { modules, formatDate, localDate } from "./config";
import { Brand, Avatar } from "./components/ui";
import {
  RecordForm,
  RecordDetails,
  DeleteDialog,
} from "./components/RecordDialogs";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { RecordsPage } from "./pages/RecordsPage";
import { Reports, reportRows } from "./pages/Reports";
import { Settings } from "./pages/Settings";
const entities = [
  "patients",
  "doctors",
  "appointments",
  "rooms",
  "invoices",
  "inventory",
];
const dateLabel = new Date().toLocaleDateString("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function App() {
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("carewell-token"),
  );
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(() =>
    modules[window.location.hash.slice(1)]
      ? window.location.hash.slice(1)
      : "dashboard",
  );
  const [sidebar, setSidebar] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState(false);
  function navigate(next) {
    window.location.hash = next;
    setPage(next);
    setSidebar(false);
    setGlobalSearch("");
    setNotifications(false);
  }
  function logout() {
    localStorage.removeItem("carewell-token");
    setAuthenticated(false);
    setUser(null);
    setData(null);
    setModal(null);
  }
  useEffect(() => {
    const handler = () => {
      const next = window.location.hash.slice(1);
      setPage(modules[next] ? next : "dashboard");
    };
    window.addEventListener("hashchange", handler);
    window.addEventListener("carewell-session-expired", logout);
    return () => {
      window.removeEventListener("hashchange", handler);
      window.removeEventListener("carewell-session-expired", logout);
    };
  }, []);
  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [me, settings, health, ...records] = await Promise.all([
        api("/auth/me"),
        api("/settings"),
        api("/health"),
        ...entities.map((entity) => api("/" + entity)),
      ]);
      setUser(me);
      setData({
        settings,
        storage: health.storage,
        ...Object.fromEntries(entities.map((key, i) => [key, records[i]])),
      });
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (authenticated) load();
  }, [authenticated]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: data?.settings.currency || "INR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  const find = (entity, id) => data?.[entity].find((row) => row.id === id);
  const openForm = (entity, record) =>
    setModal({ type: "form", entity, record });
  const view = (entity, record) => setModal({ type: "view", entity, record });
  async function save(entity, values, id) {
    const row = await api(`/${entity}${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST",
      body: values,
    });
    setData((old) => ({
      ...old,
      [entity]: id
        ? old[entity].map((r) => (r.id === id ? row : r))
        : [...old[entity], row],
    }));
    if (entity === "rooms") {
      const patients = await api("/patients");
      setData((old) => ({ ...old, patients }));
    }
    setToast(
      `${modules[entity].singular[0].toUpperCase() + modules[entity].singular.slice(1)} ${id ? "updated" : "added"} successfully.`,
    );
  }
  const stockAlerts =
    data?.inventory.filter((r) => r.quantity <= r.reorderLevel) || [];
  const overdue = data?.invoices.filter((r) => r.status === "Overdue") || [];
  const searchResults =
    globalSearch.trim().length > 1 && data
      ? entities
          .flatMap((entity) =>
            data[entity]
              .filter((row) =>
                [
                  row.name,
                  row.description,
                  row.reason,
                  find("patients", row.patientId)?.name,
                  find("doctors", row.doctorId)?.name,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase()
                  .includes(globalSearch.toLowerCase()),
              )
              .slice(0, 3)
              .map((row) => ({ entity, row })),
          )
          .slice(0, 7)
      : [];
  if (!authenticated)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          setAuthenticated(true);
        }}
      />
    );
  if (!data)
    return (
      <div className="loading-screen">
        <Brand />
        <div>
          {loading ? (
            <>
              <LoaderCircle className="spin" size={28} />
              <p>Getting your workspace ready…</p>
            </>
          ) : (
            <>
              <AlertCircle size={28} />
              <p>{loadError}</p>
              <button className="button primary" onClick={load}>
                Try again
              </button>
              <button className="text-button" onClick={logout}>
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    );
  return (
    <div className="app-shell">
      <button
        className={`sidebar-overlay ${sidebar ? "visible" : ""}`}
        onClick={() => setSidebar(false)}
        aria-label="Close navigation"
      />
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <Brand />
        <div className="hospital-switch">
          <span className="hospital-icon">
            <Building2 size={18} />
          </span>
          <div>
            <strong>{data.settings.hospitalName}</strong>
            <small>Hospital workspace</small>
          </div>
          <span className="live-dot" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {Object.entries(modules)
            .filter(([key]) => key !== "settings")
            .map(([key, config]) => (
              <button
                key={key}
                aria-label={config.label}
                aria-current={page === key ? "page" : undefined}
                className={`nav-item ${page === key ? "active" : ""}`}
                onClick={() => navigate(key)}
              >
                <config.icon size={19} />
                <span>{config.label}</span>
                {key === "appointments" && (
                  <span className="nav-count">
                    {
                      data.appointments.filter(
                        (a) =>
                          a.date === localDate() && a.status === "Scheduled",
                      ).length
                    }
                  </span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <HeartPulse size={21} />
            </span>
            <strong>A little care goes a long way.</strong>
            <p>
              Here’s to making a difference,
              <br />
              one patient at a time.
            </p>
            <span className="note-decoration">✧</span>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <modules.settings.icon size={19} />
            Settings
          </button>
          <button className="profile" onClick={() => navigate("settings")}>
            <Avatar name={user.name} />
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
            <ChevronDown size={15} />
          </button>
          <button className="logout" onClick={logout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} />{" "}
              <strong>{modules[page].label}</strong>
            </span>
          </div>
          <div className="header-search">
            <Search size={17} />
            <input
              aria-label="Search all hospital records"
              placeholder="Search anything…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
            <kbd>⌕</kbd>
            {globalSearch.trim().length > 1 && (
              <>
                <button
                  className="search-dismiss"
                  aria-label="Close search"
                  onClick={() => setGlobalSearch("")}
                />
                <div className="search-results">
                  {searchResults.length ? (
                    searchResults.map(({ entity, row }) => (
                      <button
                        key={row.id}
                        onClick={() => {
                          navigate(entity);
                          view(entity, row);
                        }}
                      >
                        <span className="search-result-icon">
                          {(() => {
                            const Icon = modules[entity].icon;
                            return <Icon size={17} />;
                          })()}
                        </span>
                        <span>
                          <strong>
                            {row.name ||
                              find("patients", row.patientId)?.name ||
                              row.description}
                          </strong>
                          <small>
                            {modules[entity].label}
                            {row.date ? " · " + formatDate(row.date) : ""}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>No matching records found.</p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <span className="date-chip">
              <CalendarDays size={15} />
              {dateLabel}
            </span>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="View notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={20} />
                {stockAlerts.length + overdue.length > 0 && <i />}
              </button>
              {notifications && (
                <>
                  <button
                    className="search-dismiss"
                    aria-label="Close notifications"
                    onClick={() => setNotifications(false)}
                  />
                  <div className="notification-panel">
                    <h3>
                      Needs your attention{" "}
                      <span>{stockAlerts.length + overdue.length}</span>
                    </h3>
                    {stockAlerts.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => {
                          navigate("inventory");
                          view("inventory", row);
                        }}
                      >
                        <span className="alert-icon">
                          <Package size={18} />
                        </span>
                        <span>
                          <strong>{row.name}</strong>
                          <small>
                            Low stock · {row.quantity} {row.unit} remaining
                          </small>
                        </span>
                      </button>
                    ))}
                    {overdue.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => {
                          navigate("invoices");
                          view("invoices", row);
                        }}
                      >
                        <span className="alert-icon peach">
                          <Wallet size={18} />
                        </span>
                        <span>
                          <strong>Overdue invoice</strong>
                          <small>
                            {find("patients", row.patientId)?.name} ·{" "}
                            {money(row.amount)}
                          </small>
                        </span>
                      </button>
                    ))}
                    {!stockAlerts.length && !overdue.length && (
                      <p className="muted padded">You’re all caught up.</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <span className="header-divider" />
            <Avatar name={user.name} size="small" />
          </div>
        </header>
        <main className="main-content" key={page}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "dashboard"
                  ? "YOUR HOSPITAL AT A GLANCE"
                  : "HOSPITAL WORKSPACE"}
              </div>
              <h1>
                {page === "dashboard"
                  ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`
                  : ""}{" "}
                {page === "dashboard" ? (
                  <span className="greeting-dot"></span>
                ) : (
                  modules[page].label
                )}
              </h1>
              <p>{modules[page].subtitle}</p>
            </div>
            <div className="heading-actions">
              {page === "dashboard" ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() => navigate("reports")}
                  >
                    <ChartIcon />
                    View reports
                  </button>
                  <button
                    className="button primary"
                    onClick={() => openForm("appointments")}
                  >
                    <Plus size={17} />
                    Book appointment
                  </button>
                </>
              ) : entities.includes(page) ? (
                <>
                  <button
                    className="button secondary"
                    onClick={() => exportRecords(page, data[page], find, money)}
                  >
                    <Download size={16} />
                    Export
                  </button>
                  <button
                    className="button primary"
                    onClick={() => openForm(page)}
                  >
                    <Plus size={17} />
                    Add {modules[page].singular}
                  </button>
                </>
              ) : page === "reports" ? (
                <button
                  className="button secondary"
                  onClick={() =>
                    exportCSV(
                      reportRows(data),
                      `carewell-report-${localDate()}.csv`,
                    )
                  }
                >
                  <Download size={16} />
                  Export report
                </button>
              ) : null}
            </div>
          </div>
          {loadError && (
            <p className="form-error" role="alert">
              {loadError}
            </p>
          )}
          {page === "dashboard" ? (
            <Dashboard
              data={data}
              user={user}
              find={find}
              money={money}
              navigate={navigate}
              openForm={openForm}
              view={view}
            />
          ) : page === "reports" ? (
            <Reports data={data} money={money} />
          ) : page === "settings" ? (
            <Settings
              data={data}
              user={user}
              onSettings={(settings) => {
                setData((old) => ({ ...old, settings }));
                setToast("Hospital settings saved.");
              }}
              onProfile={setUser}
              notify={setToast}
            />
          ) : (
            <RecordsPage
              entity={page}
              data={data}
              find={find}
              money={money}
              openForm={openForm}
              view={view}
              remove={(entity, record) =>
                setModal({ type: "delete", entity, record })
              }
            />
          )}
          <footer className="app-footer">
            <span>
              Carewell <i /> A little more care, every day.
            </span>
            <span>
              <span className="live-dot" />
              All systems operational
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal?.type === "form" && (
        <RecordForm
          key={modal.record?.id || modal.entity}
          entity={modal.entity}
          record={modal.record}
          data={data}
          money={money}
          onClose={() => setModal(null)}
          onSave={(values, id) => save(modal.entity, values, id)}
        />
      )}{" "}
      {modal?.type === "view" && (
        <RecordDetails
          entity={modal.entity}
          record={find(modal.entity, modal.record.id) || modal.record}
          data={data}
          find={find}
          money={money}
          onClose={() => setModal(null)}
          edit={() =>
            openForm(modal.entity, find(modal.entity, modal.record.id))
          }
        />
      )}{" "}
      {modal?.type === "delete" && (
        <DeleteDialog
          modal={modal}
          onClose={() => setModal(null)}
          onDelete={async () => {
            await api(`/${modal.entity}/${modal.record.id}`, {
              method: "DELETE",
            });
            setData((old) => ({
              ...old,
              [modal.entity]: old[modal.entity].filter(
                (r) => r.id !== modal.record.id,
              ),
            }));
            setToast("Record deleted.");
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ChartIcon() {
  const Icon = modules.reports.icon;
  return <Icon size={17} />;
}

function exportRecords(entity, rows, find) {
  const fields = modules[entity].fields;
  exportCSV(
    rows.map((row) =>
      Object.fromEntries([
        ["Record ID", row.id],
        ...fields.map((f) => [
          f.label,
          f.key === "patientId"
            ? find("patients", row[f.key])?.name || ""
            : f.key === "doctorId"
              ? find("doctors", row[f.key])?.name || ""
              : row[f.key],
        ]),
      ]),
    ),
    `carewell-${entity}-${localDate()}.csv`,
  );
}
