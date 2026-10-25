import { useState } from "react";
import {
  HeartPulse,
  Users,
  CalendarDays,
  BedDouble,
  Wallet,
  Stethoscope,
  Clock3,
  ArrowRight,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatDate,
  formatTime,
  localDate,
  chartColors as colors,
} from "../config";
import {
  StatCard,
  PanelHeading,
  PatientName,
  Badge,
  Empty,
} from "../components/ui";

export function FlowChart({ data, period = 7 }) {
  const series = Array.from({ length: period }, (_, i) => {
    const day = localDate(i - period + 1);
    return {
      day: formatDate(day, { weekday: "short", day: "numeric" }),
      visits: data.appointments.filter(
        (a) => a.date === day && a.status !== "Cancelled",
      ).length,
    };
  });
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart
        data={series}
        margin={{ top: 10, right: 15, bottom: 0, left: -24 }}
      >
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26998c" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#26998c" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#edf0f2"
          strokeDasharray="4 4"
        />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#7f8994" }}
          dy={10}
          minTickGap={18}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#7f8994" }}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #e8eeeb",
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="visits"
          name="Patient visits"
          stroke="#198b7e"
          strokeWidth={2.5}
          fill="url(#flowGradient)"
          activeDot={{ r: 5, strokeWidth: 3, stroke: "white" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Dashboard({
  data,
  user,
  find,
  money,
  navigate,
  openForm,
  view,
}) {
  const [period, setPeriod] = useState(7);
  const today = localDate();
  const appointments = data.appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const occupied = data.rooms.filter((r) => r.status === "Occupied").length;
  const available = data.rooms.filter((r) => r.status === "Available").length;
  const revenue = data.invoices
    .filter((i) => i.status === "Paid" && i.date === today)
    .reduce((s, i) => s + i.amount, 0);
  const availableDoctors = data.doctors.filter((d) => d.status !== "On leave");
  const departments = data.doctors.reduce((out, doctor) => {
    out[doctor.department] = (out[doctor.department] || 0) + 1;
    return out;
  }, {});
  return (
    <>
      <div className="overview-banner">
        <span className="banner-icon">
          <HeartPulse size={24} />
        </span>
        <div>
          <strong>{data.settings.tagline}</strong>
          <p>
            You have{" "}
            <b>
              {
                appointments.filter(
                  (a) => !["Completed", "Cancelled"].includes(a.status),
                ).length
              }{" "}
              appointments
            </b>{" "}
            to look forward to today. Let’s make it a good day.
          </p>
        </div>
        <span className="banner-date">
          <span className="live-dot" /> Live overview
        </span>
      </div>
      <div className="stats-grid">
        <StatCard
          label="Total patients"
          value={data.patients.length.toLocaleString()}
          icon={Users}
          tag={`${data.patients.filter((p) => p.status === "Admitted").length} admitted`}
          note="patients in your care"
        />
        <StatCard
          label="Today’s appointments"
          value={appointments.length.toString().padStart(2, "0")}
          icon={CalendarDays}
          tone="blue"
          tag={`${appointments.filter((a) => a.status === "Completed").length} completed`}
          note="on today’s schedule"
        />
        <StatCard
          label="Available beds"
          value={available.toString().padStart(2, "0")}
          icon={BedDouble}
          tone="peach"
          tag={`${data.rooms.length} total`}
          note="beds across all wards"
        />
        <StatCard
          label="Today’s revenue"
          value={money(revenue)}
          icon={Wallet}
          tone="lavender"
          tag="Collected"
          note="from paid invoices"
        />
      </div>
      <div className="dashboard-middle">
        <section className="panel chart-panel">
          <PanelHeading
            title="Patient activity"
            subtitle="A look at visits across your hospital"
            action={
              <select
                className="compact-select"
                aria-label="Patient activity period"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            }
          />
          <div className="chart-caption">
            <span className="chart-number">
              {
                data.appointments.filter(
                  (a) =>
                    a.date >= localDate(1 - period) &&
                    a.date <= today &&
                    a.status !== "Cancelled",
                ).length
              }
            </span>
            <span>
              patient visits{" "}
              <span className="chart-legend">
                <i />
                Total visits
              </span>
            </span>
          </div>
          <div className="activity-chart">
            <FlowChart data={data} period={period} />
          </div>
        </section>
        <section className="panel department-panel">
          <PanelHeading
            title="Your care team"
            subtitle="Expertise, working together"
          />
          <div className="team-total">
            <span className="team-total-icon">
              <Stethoscope size={28} />
            </span>
            <div>
              <strong>{data.doctors.length}</strong>
              <span>
                doctors · {Object.keys(departments).length} departments
              </span>
            </div>
          </div>
          <div className="department-bars">
            {Object.entries(departments)
              .slice(0, 4)
              .map(([name, count], i) => (
                <div className="department-row" key={name}>
                  <div>
                    <span>
                      <i style={{ background: colors[i] }} />
                      {name}
                    </span>
                    <strong>
                      {count} {count === 1 ? "doctor" : "doctors"}
                    </strong>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${Math.max((count / Math.max(data.doctors.length, 1)) * 100, 12)}%`,
                        background: colors[i],
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
          <button className="panel-link" onClick={() => navigate("doctors")}>
            Meet your team <ArrowRight size={15} />
          </button>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel schedule-panel">
          <PanelHeading
            title="Today’s appointments"
            subtitle={`${formatDate(today, { weekday: "long", day: "numeric", month: "long" })} · ${appointments.length} appointments`}
            action={
              <button
                className="text-button"
                onClick={() => navigate("appointments")}
              >
                View all <ArrowRight size={15} />
              </button>
            }
          />
          {appointments.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th aria-label="View" />
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 5).map((row, i) => (
                    <tr key={row.id}>
                      <td>
                        <PatientName
                          patient={find("patients", row.patientId)}
                          index={i}
                        />
                      </td>
                      <td>
                        <span className="table-main">
                          {find("doctors", row.doctorId)?.name}
                        </span>
                        <span className="table-secondary">{row.type}</span>
                      </td>
                      <td>
                        <span className="time-label">
                          <Clock3 size={13} />
                          {formatTime(row.time)}
                        </span>
                      </td>
                      <td>
                        <Badge value={row.status} />
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`View appointment for ${find("patients", row.patientId)?.name}`}
                          onClick={() => view("appointments", row)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="A clear schedule"
              description="Book an appointment to get your day started."
              action={
                <button
                  className="button secondary"
                  onClick={() => openForm("appointments")}
                >
                  Book appointment
                </button>
              }
            />
          )}
          <div className="table-footer">
            <span>
              Showing {Math.min(5, appointments.length)} of{" "}
              {appointments.length} appointments
            </span>
            <span className="schedule-footnote">
              <span className="live-dot" />
              Updated just now
            </span>
          </div>
        </section>
        <div className="dashboard-side">
          <section className="panel bed-panel">
            <PanelHeading
              title="Bed occupancy"
              action={<BedDouble size={20} className="muted" />}
            />
            <div className="occupancy-number">
              <strong>
                {data.rooms.length
                  ? Math.round((occupied / data.rooms.length) * 100)
                  : 0}
                <small>%</small>
              </strong>
              <span>of beds occupied</span>
            </div>
            <div className="bed-grid-mini">
              {data.rooms.map((row) => (
                <button
                  key={row.id}
                  className={`mini-bed ${row.status.toLowerCase()}`}
                  onClick={() => view("rooms", row)}
                  title={`${row.name}: ${row.status}`}
                  aria-label={`${row.name}: ${row.status}`}
                >
                  <BedDouble size={19} />
                </button>
              ))}
            </div>
            <div className="bed-legend">
              <span>
                <i className="teal" />
                Occupied <b>{occupied}</b>
              </span>
              <span>
                <i className="pale" />
                Available <b>{available}</b>
              </span>
            </div>
            <button className="panel-link" onClick={() => navigate("rooms")}>
              Manage wards <ArrowRight size={15} />
            </button>
          </section>
          <section className="quick-actions">
            <span className="eyebrow">A HEAD START</span>
            <h3>Small actions. Better flow.</h3>
            <div>
              <button onClick={() => openForm("patients")}>
                <Users size={16} />
                Add patient
                <Plus size={14} />
              </button>
              <button onClick={() => openForm("invoices")}>
                <Wallet size={16} />
                Create invoice
                <Plus size={14} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
