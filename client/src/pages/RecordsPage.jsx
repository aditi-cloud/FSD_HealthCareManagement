import { useState, useEffect } from "react";
import {
  Search,
  X,
  Package,
  ShieldCheck,
  Plus,
  Clock3,
  BedDouble,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { modules, formatDate, formatTime, localDate } from "../config";
import { Avatar, Badge, Empty, PatientName } from "../components/ui";

export function RecordsPage({
  entity,
  data,
  find,
  money,
  openForm,
  view,
  remove,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [current, setCurrent] = useState(1);
  const config = modules[entity];
  useEffect(() => setCurrent(1), [search, filter, dateFilter]);
  let rows = data[entity].filter((row) => {
    const relationNames = [
      find("patients", row.patientId)?.name,
      find("doctors", row.doctorId)?.name,
    ]
      .filter(Boolean)
      .join(" ");
    const matches = Object.values(row)
      .join(" ")
      .concat(" " + relationNames)
      .toLowerCase()
      .includes(search.toLowerCase());
    return (
      matches &&
      (filter === "All" ||
        (entity === "inventory" ? row.category : row.status) === filter) &&
      (entity !== "appointments" ||
        dateFilter === "all" ||
        (dateFilter === "today"
          ? row.date === localDate()
          : row.date >= localDate()))
    );
  });
  if (entity === "appointments")
    rows = [...rows].sort(
      (a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time),
    );
  const pageCount = Math.max(1, Math.ceil(rows.length / 8));
  const safeCurrent = Math.min(current, pageCount);
  const visible = rows.slice((safeCurrent - 1) * 8, safeCurrent * 8);
  const columns = {
    patients: [
      ["Patient", (r, i) => <PatientName patient={r} index={i} />],
      [
        "Contact",
        (r) => (
          <>
            <span className="table-main">{r.phone || "—"}</span>
            <span className="table-secondary">
              {r.email || "No email added"}
            </span>
          </>
        ),
      ],
      [
        "Blood group",
        (r) => <span className="blood-group">{r.bloodGroup}</span>,
      ],
      ["Reason for visit", (r) => r.condition || "—"],
      ["Status", (r) => <Badge value={r.status} />],
    ],
    appointments: [
      [
        "Patient",
        (r, i) => (
          <PatientName patient={find("patients", r.patientId)} index={i} />
        ),
      ],
      [
        "Doctor",
        (r) => (
          <>
            <span className="table-main">
              {find("doctors", r.doctorId)?.name}
            </span>
            <span className="table-secondary">
              {find("doctors", r.doctorId)?.department}
            </span>
          </>
        ),
      ],
      [
        "Date & time",
        (r) => (
          <>
            <span className="table-main">{formatDate(r.date)}</span>
            <span className="table-secondary">{formatTime(r.time)}</span>
          </>
        ),
      ],
      ["Visit type", (r) => r.type],
      ["Status", (r) => <Badge value={r.status} />],
    ],
    invoices: [
      [
        "Invoice",
        (r) => (
          <>
            <span className="table-main mono">
              INV-{r.id.slice(0, 6).toUpperCase()}
            </span>
            <span className="table-secondary">{formatDate(r.date)}</span>
          </>
        ),
      ],
      [
        "Patient",
        (r, i) => (
          <PatientName
            patient={find("patients", r.patientId)}
            index={i}
            secondary={r.description}
          />
        ),
      ],
      ["Amount", (r) => <strong className="amount">{money(r.amount)}</strong>],
      ["Due date", (r) => formatDate(r.dueDate)],
      ["Status", (r) => <Badge value={r.status} />],
    ],
    inventory: [
      [
        "Item",
        (r) => (
          <div className="person-cell">
            <span className="inventory-icon">
              <Package size={19} />
            </span>
            <span>
              <strong>{r.name}</strong>
              <small>{r.category}</small>
            </span>
          </div>
        ),
      ],
      [
        "Stock",
        (r) => (
          <>
            <span className="table-main">
              {r.quantity} {r.unit}
            </span>
            <span className="table-secondary">Reorder at {r.reorderLevel}</span>
          </>
        ),
      ],
      ["Unit price", (r) => money(r.unitPrice)],
      ["Expiry", (r) => (r.expiryDate ? formatDate(r.expiryDate) : "—")],
      [
        "Status",
        (r) => (
          <Badge
            value={
              r.quantity === 0
                ? "Out of stock"
                : r.quantity <= r.reorderLevel
                  ? "Low stock"
                  : "Available"
            }
          />
        ),
      ],
    ],
  };
  return (
    <>
      {entity === "invoices" && (
        <div className="mini-stats">
          <div>
            <span>Total billed</span>
            <strong>
              {money(data.invoices.reduce((s, r) => s + r.amount, 0))}
            </strong>
          </div>
          <div>
            <span>
              <i className="teal" />
              Collected
            </span>
            <strong>
              {money(
                data.invoices
                  .filter((r) => r.status === "Paid")
                  .reduce((s, r) => s + r.amount, 0),
              )}
            </strong>
          </div>
          <div>
            <span>
              <i className="amber" />
              Outstanding
            </span>
            <strong>
              {money(
                data.invoices
                  .filter((r) => r.status !== "Paid")
                  .reduce((s, r) => s + r.amount, 0),
              )}
            </strong>
          </div>
        </div>
      )}
      {entity === "rooms" && (
        <div className="mini-stats">
          {["Available", "Occupied", "Maintenance"].map((status) => (
            <div key={status}>
              <span>{status}</span>
              <strong>
                {data.rooms.filter((r) => r.status === status).length}
                <small> beds</small>
              </strong>
            </div>
          ))}
        </div>
      )}
      {entity === "inventory" &&
        data.inventory.some((r) => r.quantity <= r.reorderLevel) && (
          <div className="stock-warning">
            <AlertCircle size={18} />
            <span>
              <strong>
                {
                  data.inventory.filter((r) => r.quantity <= r.reorderLevel)
                    .length
                }{" "}
                items need restocking.
              </strong>{" "}
              Review your inventory to keep essential supplies on hand.
            </span>
          </div>
        )}
      <section
        className={`panel records-panel ${["doctors", "rooms"].includes(entity) ? "cards-panel" : ""}`}
      >
        <div className="records-toolbar">
          <div className="filter-tabs" role="group" aria-label="Filter records">
            {["All", ...config.filters].map((value) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
              >
                {value}
                {value === "All" && <span>{data[entity].length}</span>}
              </button>
            ))}
          </div>
          <div className="records-tools">
            {entity === "appointments" && (
              <select
                aria-label="Filter appointment date"
                className="compact-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Today & upcoming</option>
              </select>
            )}
            <div className="list-search">
              <Search size={16} />
              <input
                aria-label={`Search ${config.label.toLowerCase()}`}
                placeholder={`Search ${config.label.toLowerCase()}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        {!rows.length ? (
          <Empty
            title={
              search || filter !== "All"
                ? "No matching records"
                : "Your next chapter starts here"
            }
            description={
              search || filter !== "All"
                ? "Try a different search or filter."
                : `Add your first ${config.singular} to start building your records.`
            }
            action={
              !search &&
              filter === "All" && (
                <button
                  className="button primary"
                  onClick={() => openForm(entity)}
                >
                  <Plus size={16} />
                  Add {config.singular}
                </button>
              )
            }
          />
        ) : entity === "doctors" ? (
          <div className="doctor-grid">
            {visible.map((row, i) => (
              <article className="doctor-card" key={row.id}>
                <div className="doctor-card-top">
                  <Avatar name={row.name} size="large" index={i} />
                  <Badge value={row.status} />
                </div>
                <h3>{row.name}</h3>
                <p className="doctor-dept">{row.department}</p>
                <div className="doctor-meta">
                  <span>
                    <ShieldCheck size={14} />
                    {row.qualification}
                  </span>
                  <span>
                    <Clock3 size={14} />
                    {row.experience} years of experience
                  </span>
                </div>
                <div className="doctor-card-bottom">
                  <span>
                    {money(row.fee)}
                    <small> / visit</small>
                  </span>
                  <RecordActions
                    entity={entity}
                    row={row}
                    view={view}
                    edit={openForm}
                    remove={remove}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : entity === "rooms" ? (
          <div className="rooms-grid">
            {visible.map((row) => (
              <article
                key={row.id}
                className={`room-card room-${row.status.toLowerCase()}`}
              >
                <div className="room-card-top">
                  <span className="room-icon">
                    <BedDouble size={24} />
                  </span>
                  <Badge value={row.status} />
                </div>
                <h3>{row.name}</h3>
                <p>
                  {row.type} <span>·</span> {row.floor}
                </p>
                <div className="room-patient">
                  {row.patientId ? (
                    <>
                      <Avatar
                        name={find("patients", row.patientId)?.name}
                        size="small"
                      />
                      <span>{find("patients", row.patientId)?.name}</span>
                    </>
                  ) : (
                    <span className="muted">
                      {row.status === "Maintenance"
                        ? "Temporarily unavailable"
                        : "Ready for the next patient"}
                    </span>
                  )}
                </div>
                <div className="doctor-card-bottom">
                  <span>
                    {money(row.dailyRate)}
                    <small> / day</small>
                  </span>
                  <RecordActions
                    entity={entity}
                    row={row}
                    view={view}
                    edit={openForm}
                    remove={remove}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns[entity].map(([label]) => (
                    <th key={label}>{label}</th>
                  ))}
                  <th className="actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr key={row.id}>
                    {columns[entity].map(([label, render]) => (
                      <td key={label}>{render(row, i)}</td>
                    ))}
                    <td>
                      <RecordActions
                        entity={entity}
                        row={row}
                        view={view}
                        edit={openForm}
                        remove={remove}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>
            Showing {rows.length ? (safeCurrent - 1) * 8 + 1 : 0}–
            {Math.min(safeCurrent * 8, rows.length)} of {rows.length}{" "}
            {config.label.toLowerCase()}
          </span>
          <div className="pagination">
            <button
              aria-label="Previous page"
              disabled={safeCurrent === 1}
              onClick={() => setCurrent(safeCurrent - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {safeCurrent} <small>/ {pageCount}</small>
            </span>
            <button
              aria-label="Next page"
              disabled={safeCurrent === pageCount}
              onClick={() => setCurrent(safeCurrent + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <p className="below-table">
        <ShieldCheck size={14} />
        Your records are saved automatically when you submit a form.
      </p>
    </>
  );
}

export function RecordActions({ entity, row, view, edit, remove }) {
  const name = row.name || row.description || "appointment";
  return (
    <div className="record-actions">
      <button
        className="icon-button"
        title="View details"
        aria-label={`View ${name}`}
        onClick={() => view(entity, row)}
      >
        <Eye size={16} />
      </button>
      <button
        className="icon-button"
        title="Edit record"
        aria-label={`Edit ${name}`}
        onClick={() => edit(entity, row)}
      >
        <Pencil size={15} />
      </button>
      <button
        className="icon-button delete-action"
        title="Delete record"
        aria-label={`Delete ${name}`}
        onClick={() => remove(entity, row)}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
