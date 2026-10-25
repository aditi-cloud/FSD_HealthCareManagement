import { useState } from "react";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  Trash2,
  Pencil,
  Printer,
} from "lucide-react";
import { modules, formatDate, formatTime } from "../config";
import { Brand, Badge, Modal } from "./ui";

export function RecordForm({ entity, record, data, onClose, onSave, money }) {
  const config = modules[entity];
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      config.fields.map((f) => [
        f.key,
        record?.[f.key] ??
          (typeof f.default === "function"
            ? f.default()
            : (f.default ??
              (f.type === "select"
                ? Array.isArray(f.options)
                  ? f.options[0]
                  : ""
                : ""))),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function change(key, value) {
    setValues((old) => {
      const next = { ...old, [key]: value };
      if (entity === "rooms" && key === "status" && value !== "Occupied")
        next.patientId = "";
      return next;
    });
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(values, record?.id);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? "Edit" : "Add"} ${config.singular}`}
      subtitle={
        record
          ? "Keep this record up to date."
          : `A few details to get your new ${config.singular} started.`
      }
      onClose={() => !busy && onClose()}
      wide
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          {config.fields.map((field) => {
            const relational = typeof field.options === "string";
            const options = relational
              ? data[field.options].map((row) => ({
                  value: row.id,
                  label:
                    row.name +
                    (field.options === "doctors" ? ` · ${row.department}` : ""),
                }))
              : (field.options || []).map((value) => ({ value, label: value }));
            return (
              <label className={field.wide ? "wide" : ""} key={field.key}>
                {field.label}
                {field.required && (
                  <span className="required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                )}
                {field.type === "select" ? (
                  <select
                    aria-label={field.label}
                    value={values[field.key]}
                    required={field.required}
                    disabled={
                      entity === "rooms" &&
                      field.key === "patientId" &&
                      values.status !== "Occupied"
                    }
                    onChange={(e) => change(field.key, e.target.value)}
                  >
                    {(relational || field.empty) && (
                      <option value="">
                        {field.empty
                          ? "No patient assigned"
                          : "Select " + field.label.toLowerCase()}
                      </option>
                    )}
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    aria-label={field.label}
                    rows={3}
                    maxLength={3000}
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => change(field.key, e.target.value)}
                  />
                ) : (
                  <input
                    aria-label={field.label}
                    type={field.type}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                    step={
                      field.type === "number"
                        ? [
                            "age",
                            "experience",
                            "quantity",
                            "reorderLevel",
                          ].includes(field.key)
                          ? "1"
                          : "0.01"
                        : undefined
                    }
                    maxLength={field.type === "text" ? 500 : undefined}
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => change(field.key, e.target.value)}
                  />
                )}
              </label>
            );
          })}
        </div>
        {entity === "rooms" && (
          <p className="field-hint">
            Assigning a bed admits the patient. Releasing the bed marks them as
            discharged.
          </p>
        )}
        {entity === "invoices" && values.amount > 0 && (
          <div className="invoice-total">
            <span>Invoice total</span>
            <strong>{money(Number(values.amount))}</strong>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            <AlertCircle size={17} />
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}{" "}
            {busy
              ? "Saving…"
              : record
                ? "Save changes"
                : `Add ${config.singular}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog({ modal, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={`Delete ${modules[modal.entity].singular}?`}
      onClose={() => !busy && onClose()}
    >
      <div className="delete-content">
        <span className="delete-icon">
          <Trash2 size={25} />
        </span>
        <p>
          This will permanently remove{" "}
          <strong>
            {modal.record.name ||
              modal.record.description ||
              "this appointment"}
          </strong>
          . This action cannot be undone.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Keep record
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onDelete();
            } catch (err) {
              setError(err.message);
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete record"}
        </button>
      </div>
    </Modal>
  );
}

export function RecordDetails({
  entity,
  record,
  data,
  find,
  money,
  onClose,
  edit,
}) {
  const config = modules[entity];
  const relatedAppointments =
    entity === "patients"
      ? data.appointments.filter((a) => a.patientId === record.id)
      : entity === "doctors"
        ? data.appointments.filter((a) => a.doctorId === record.id)
        : [];
  const relatedInvoices =
    entity === "patients"
      ? data.invoices.filter((i) => i.patientId === record.id)
      : [];
  function value(field) {
    const val = record[field.key];
    if (field.key === "patientId")
      return find("patients", val)?.name || "No patient assigned";
    if (field.key === "doctorId") return find("doctors", val)?.name || "—";
    if (["amount", "fee", "unitPrice", "dailyRate"].includes(field.key))
      return money(val);
    if (field.type === "date") return formatDate(val);
    if (field.type === "time") return formatTime(val);
    if (field.key === "status") return <Badge value={val} />;
    return val === 0 ? "0" : val || "—";
  }
  return (
    <Modal
      title={
        entity === "invoices"
          ? `Invoice INV-${record.id.slice(0, 6).toUpperCase()}`
          : record.name || "Appointment details"
      }
      subtitle={`${config.singular[0].toUpperCase() + config.singular.slice(1)} record · Added ${formatDate(record.createdAt)}`}
      onClose={onClose}
      wide
    >
      {entity === "invoices" && (
        <div className="invoice-letterhead">
          <Brand />
          <div>
            <strong>{data.settings.hospitalName}</strong>
            <p>{data.settings.address}</p>
            <p>
              {data.settings.phone} · {data.settings.email}
            </p>
          </div>
        </div>
      )}
      <div className="detail-grid">
        {config.fields
          .filter((f) => f.key !== "name")
          .map((field) => (
            <div key={field.key} className={field.wide ? "wide" : ""}>
              <dt>{field.label}</dt>
              <dd>{value(field)}</dd>
            </div>
          ))}
      </div>
      {entity === "patients" && (
        <div className="related-summary">
          <div>
            <span>Appointments</span>
            <strong>{relatedAppointments.length}</strong>
          </div>
          <div>
            <span>Total billed</span>
            <strong>
              {money(relatedInvoices.reduce((s, i) => s + i.amount, 0))}
            </strong>
          </div>
          <div>
            <span>Outstanding</span>
            <strong>
              {money(
                relatedInvoices
                  .filter((i) => i.status !== "Paid")
                  .reduce((s, i) => s + i.amount, 0),
              )}
            </strong>
          </div>
        </div>
      )}
      {["patients", "doctors"].includes(entity) && (
        <div className="related-list">
          <h3>
            Recent appointments <span>{relatedAppointments.length}</span>
          </h3>
          {relatedAppointments.length ? (
            relatedAppointments
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((row) => (
                <div key={row.id}>
                  <span>
                    <strong>
                      {entity === "patients"
                        ? find("doctors", row.doctorId)?.name
                        : find("patients", row.patientId)?.name}
                    </strong>
                    <small>
                      {formatDate(row.date)} · {formatTime(row.time)} ·{" "}
                      {row.type}
                    </small>
                  </span>
                  <Badge value={row.status} />
                </div>
              ))
          ) : (
            <p className="muted">No appointments recorded yet.</p>
          )}
        </div>
      )}
      <div className="modal-footer">
        {entity === "invoices" && (
          <button
            className="button secondary print-button"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print invoice
          </button>
        )}
        <button className="button secondary" onClick={onClose}>
          Close
        </button>
        <button className="button primary" onClick={edit}>
          <Pencil size={15} />
          Edit {config.singular}
        </button>
      </div>
    </Modal>
  );
}
