import { Wallet, CheckCircle2, Stethoscope, Package } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, localDate, chartColors as colors } from "../config";
import { StatCard, PanelHeading } from "../components/ui";

export function reportRows(data) {
  return [
    { Metric: "Total patients", Value: data.patients.length },
    {
      Metric: "Admitted patients",
      Value: data.patients.filter((p) => p.status === "Admitted").length,
    },
    { Metric: "Total doctors", Value: data.doctors.length },
    { Metric: "Total appointments", Value: data.appointments.length },
    {
      Metric: "Completed appointments",
      Value: data.appointments.filter((a) => a.status === "Completed").length,
    },
    {
      Metric: "Available beds",
      Value: data.rooms.filter((r) => r.status === "Available").length,
    },
    {
      Metric: "Revenue collected",
      Value: data.invoices
        .filter((i) => i.status === "Paid")
        .reduce((s, i) => s + i.amount, 0),
    },
    {
      Metric: "Outstanding amount",
      Value: data.invoices
        .filter((i) => i.status !== "Paid")
        .reduce((s, i) => s + i.amount, 0),
    },
    {
      Metric: "Low stock items",
      Value: data.inventory.filter((i) => i.quantity <= i.reorderLevel).length,
    },
  ];
}

export function Reports({ data, money }) {
  const totalBilled = data.invoices.reduce((s, i) => s + i.amount, 0);
  const collected = data.invoices
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + i.amount, 0);
  const completed = data.appointments.filter(
    (a) => a.status === "Completed",
  ).length;
  const revenue = Array.from({ length: 7 }, (_, i) => {
    const date = localDate(i - 6);
    return {
      day: formatDate(date, { weekday: "short" }),
      collected: data.invoices
        .filter((r) => r.date === date && r.status === "Paid")
        .reduce((s, r) => s + r.amount, 0),
      pending: data.invoices
        .filter((r) => r.date === date && r.status !== "Paid")
        .reduce((s, r) => s + r.amount, 0),
    };
  });
  const distribution = [
    "Scheduled",
    "Checked in",
    "Completed",
    "Cancelled",
  ].map((name) => ({
    name,
    value: data.appointments.filter((r) => r.status === name).length,
  }));
  return (
    <>
      <div className="stats-grid">
        <StatCard
          label="Total billed"
          value={money(totalBilled)}
          icon={Wallet}
          note="across all invoices"
          tag={`${data.invoices.length} invoices`}
        />
        <StatCard
          label="Collection rate"
          value={`${totalBilled ? Math.round((collected / totalBilled) * 100) : 0}%`}
          icon={CheckCircle2}
          note="of total billed amount"
          tone="blue"
          tag={money(collected)}
        />
        <StatCard
          label="Completed visits"
          value={completed}
          icon={Stethoscope}
          note="across all appointments"
          tone="peach"
          tag={`${data.appointments.length} total`}
        />
        <StatCard
          label="Inventory value"
          value={money(
            data.inventory.reduce((s, r) => s + r.quantity * r.unitPrice, 0),
          )}
          icon={Package}
          note="at current unit prices"
          tone="lavender"
          tag={`${data.inventory.length} items`}
        />
      </div>
      <div className="reports-charts">
        <section className="panel">
          <PanelHeading
            title="Revenue overview"
            subtitle="Collected and outstanding · Last 7 days"
          />
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={revenue}
                margin={{ left: 0, right: 15, top: 15, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#edf0f2"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#7f8994" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#7f8994" }}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  formatter={(value) => money(value)}
                  contentStyle={{ borderRadius: 10, fontSize: 12 }}
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
                  stackId="a"
                  fill="#198b7e"
                  radius={[0, 0, 3, 3]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey="pending"
                  name="Outstanding"
                  stackId="a"
                  fill="#ebc49e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="report-legend">
            <span>
              <i className="teal" />
              Collected
            </span>
            <span>
              <i className="amber" />
              Outstanding
            </span>
          </div>
        </section>
        <section className="panel">
          <PanelHeading
            title="Appointment breakdown"
            subtitle="All appointments by status"
          />
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={230} minWidth={0}>
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={4}
                  stroke="none"
                >
                  {distribution.map((item, i) => (
                    <Cell key={item.name} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <strong>{data.appointments.length}</strong>
              <span>appointments</span>
            </div>
          </div>
          <div className="donut-legend">
            {distribution.map((item, i) => (
              <div key={item.name}>
                <span>
                  <i style={{ background: colors[i] }} />
                  {item.name}
                </span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel report-summary">
        <PanelHeading
          title="Operations snapshot"
          subtitle="Live totals from your hospital records"
        />
        <div className="snapshot-grid">
          {[
            [
              "Patient admissions",
              data.patients.filter((p) => p.status === "Admitted").length,
              "currently admitted",
            ],
            [
              "Bed occupancy",
              `${data.rooms.length ? Math.round((data.rooms.filter((r) => r.status === "Occupied").length / data.rooms.length) * 100) : 0}%`,
              "of total beds",
            ],
            [
              "Outstanding balance",
              money(totalBilled - collected),
              "awaiting payment",
            ],
            [
              "Low stock items",
              data.inventory.filter((r) => r.quantity <= r.reorderLevel).length,
              "at or below reorder level",
            ],
          ].map(([label, value, note]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
