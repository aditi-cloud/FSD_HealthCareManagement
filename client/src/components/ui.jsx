import { useEffect, useRef } from "react";
import { Plus, Search, X } from "lucide-react";
import { initials } from "../config";

export function Brand({ large = false }) {
  return (
    <div className={`brand ${large ? "brand-large" : ""}`}>
      <span className="brand-mark">
        <Plus strokeWidth={3} />
      </span>
      <span>
        carewell<span className="brand-sub">HOSPITAL MANAGEMENT</span>
      </span>
    </div>
  );
}

export function Avatar({ name, size = "normal", index = 0 }) {
  return (
    <span className={`avatar ${size} tone-${index % 5}`}>{initials(name)}</span>
  );
}

export function Badge({ value }) {
  const positive = ["Available", "Paid", "Completed", "Discharged"];
  const warning = [
    "Pending",
    "Scheduled",
    "On leave",
    "Maintenance",
    "Low stock",
  ];
  const bad = ["Overdue", "Cancelled", "Out of stock"];
  return (
    <span
      className={`badge ${positive.includes(value) ? "positive" : warning.includes(value) ? "warning" : bad.includes(value) ? "negative" : "neutral"}`}
    >
      <i />
      {value}
    </span>
  );
}

export function Empty({
  title = "No records yet",
  description = "Add your first record to get started.",
  action,
}) {
  return (
    <div className="empty">
      <span>
        <Search size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const focusable = ref.current.querySelectorAll(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        );
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  note,
  tone = "teal",
  tag,
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={20} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-bottom">
        {tag && <span className="stat-tag">{tag}</span>}
        <span>{note}</span>
      </div>
    </div>
  );
}

export function PanelHeading({ title, subtitle, action }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PatientName({ patient, index = 0, secondary }) {
  return (
    <div className="person-cell">
      <Avatar name={patient?.name} index={index} />
      <span>
        <strong>{patient?.name || "Unknown patient"}</strong>
        <small>
          {secondary ||
            `${patient?.age ?? "—"} yrs · ${patient?.gender || "—"}`}
        </small>
      </span>
    </div>
  );
}
