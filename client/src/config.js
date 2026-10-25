import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  BedDouble,
  Receipt,
  Pill,
  ChartNoAxesCombined,
  Settings,
} from "lucide-react";
export const localDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const departments = [
  "General Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Emergency",
];
const field = (key, label, type = "text", extra = {}) => ({
  key,
  label,
  type,
  ...extra,
});
const select = (key, label, options, extra = {}) =>
  field(key, label, "select", { options, ...extra });
export const modules = {
  dashboard: {
    label: "Overview",
    icon: LayoutDashboard,
    subtitle: "A little clarity for a busy day.",
  },
  patients: {
    label: "Patients",
    singular: "patient",
    icon: Users,
    subtitle: "Every patient, and every detail that matters.",
    filters: ["Outpatient", "Admitted", "Discharged"],
    fields: [
      field("name", "Full name", "text", {
        required: true,
        placeholder: "e.g. Ananya Sharma",
      }),
      field("age", "Age", "number", { required: true, min: 0, max: 130 }),
      select("gender", "Gender", ["Female", "Male", "Other"]),
      field("phone", "Phone", "tel", { placeholder: "+91 98765 43210" }),
      field("email", "Email", "email", { placeholder: "patient@example.com" }),
      select("bloodGroup", "Blood group", [
        "Unknown",
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ]),
      field("address", "Address", "text", {
        wide: true,
        placeholder: "Street, city, state and postal code",
      }),
      field("emergencyContact", "Emergency contact", "text", {
        placeholder: "Name and phone number",
      }),
      field("condition", "Reason for visit", "text", {
        placeholder: "e.g. Routine check-up",
      }),
      select("status", "Patient status", [
        "Outpatient",
        "Admitted",
        "Discharged",
      ]),
      field("notes", "Notes", "textarea", {
        wide: true,
        placeholder:
          "Medical history, allergies or other relevant information…",
      }),
    ],
  },
  appointments: {
    label: "Appointments",
    singular: "appointment",
    icon: CalendarDays,
    subtitle: "Keep the day running smoothly.",
    filters: ["Scheduled", "Checked in", "Completed", "Cancelled"],
    fields: [
      select("patientId", "Patient", "patients", { required: true }),
      select("doctorId", "Doctor", "doctors", { required: true }),
      field("date", "Appointment date", "date", {
        required: true,
        default: localDate,
      }),
      field("time", "Time", "time", { required: true, default: "09:00" }),
      select("type", "Visit type", [
        "Consultation",
        "Follow-up",
        "Check-up",
        "Emergency",
      ]),
      select("status", "Status", [
        "Scheduled",
        "Checked in",
        "Completed",
        "Cancelled",
      ]),
      field("reason", "Reason for visit", "text", {
        wide: true,
        placeholder: "What brings the patient in?",
      }),
      field("notes", "Notes", "textarea", {
        wide: true,
        placeholder: "Additional appointment details…",
      }),
    ],
  },
  doctors: {
    label: "Doctors",
    singular: "doctor",
    icon: Stethoscope,
    subtitle: "Good care starts with a great team.",
    filters: ["Available", "On leave", "In consultation"],
    fields: [
      field("name", "Full name", "text", {
        required: true,
        placeholder: "e.g. Dr. Sarah Thomas",
      }),
      select("department", "Department", departments),
      field("qualification", "Qualification", "text", {
        default: "MBBS",
        placeholder: "e.g. MBBS, MD",
      }),
      field("experience", "Experience (years)", "number", {
        min: 0,
        max: 70,
        default: 0,
      }),
      field("phone", "Phone", "tel", { placeholder: "+91 98765 43210" }),
      field("email", "Email", "email", { placeholder: "doctor@example.com" }),
      field("fee", "Consultation fee", "number", {
        min: 0,
        max: 100000,
        default: 500,
      }),
      select("status", "Availability", [
        "Available",
        "On leave",
        "In consultation",
      ]),
      field("notes", "Notes", "textarea", {
        wide: true,
        placeholder: "Special interests, working hours or other details…",
      }),
    ],
  },
  rooms: {
    label: "Wards & beds",
    singular: "bed",
    icon: BedDouble,
    subtitle: "A comfortable place for every patient.",
    filters: ["Available", "Occupied", "Maintenance"],
    fields: [
      field("name", "Bed / room number", "text", {
        required: true,
        placeholder: "e.g. GW-01",
      }),
      select("type", "Room type", [
        "General Ward",
        "Private Room",
        "ICU",
        "Emergency",
      ]),
      field("floor", "Floor", "text", { default: "Ground floor" }),
      field("dailyRate", "Daily rate", "number", {
        required: true,
        min: 0,
        max: 1000000,
        default: 1200,
      }),
      select("status", "Bed status", ["Available", "Occupied", "Maintenance"]),
      select("patientId", "Assigned patient", "patients", { empty: true }),
      field("notes", "Notes", "textarea", {
        wide: true,
        placeholder: "Facilities, equipment or care requirements…",
      }),
    ],
  },
  invoices: {
    label: "Billing",
    singular: "invoice",
    icon: Receipt,
    subtitle: "Simple billing. One less thing to worry about.",
    filters: ["Paid", "Pending", "Overdue"],
    fields: [
      select("patientId", "Patient", "patients", { required: true }),
      field("description", "Description", "text", {
        required: true,
        placeholder: "e.g. Consultation and laboratory tests",
      }),
      field("amount", "Amount", "number", {
        required: true,
        min: 1,
        max: 100000000,
      }),
      select("status", "Payment status", ["Pending", "Paid", "Overdue"]),
      field("date", "Invoice date", "date", {
        required: true,
        default: localDate,
      }),
      field("dueDate", "Due date", "date", {
        required: true,
        default: () => localDate(7),
      }),
      select("paymentMethod", "Payment method", [
        "UPI",
        "Cash",
        "Card",
        "Insurance",
        "Bank transfer",
      ]),
      field("notes", "Notes", "textarea", {
        wide: true,
        placeholder: "Payment references or billing notes…",
      }),
    ],
  },
  inventory: {
    label: "Pharmacy & stock",
    singular: "item",
    icon: Pill,
    subtitle: "The right supplies, right when you need them.",
    filters: ["Medicine", "Equipment", "Consumable"],
    fields: [
      field("name", "Item name", "text", {
        required: true,
        placeholder: "e.g. Paracetamol 500mg",
      }),
      select("category", "Category", ["Medicine", "Equipment", "Consumable"]),
      field("quantity", "Quantity in stock", "number", {
        required: true,
        min: 0,
        max: 1000000,
        default: 0,
      }),
      field("unit", "Unit", "text", {
        default: "units",
        placeholder: "e.g. tablets, boxes, units",
      }),
      field("reorderLevel", "Low stock threshold", "number", {
        min: 0,
        max: 100000,
        default: 20,
      }),
      field("unitPrice", "Unit price", "number", {
        min: 0,
        max: 1000000,
        default: 0,
      }),
      field("supplier", "Supplier", "text", { placeholder: "Supplier name" }),
      field("expiryDate", "Expiry date", "date"),
      field("notes", "Notes", "textarea", {
        wide: true,
        placeholder: "Storage instructions or supplier details…",
      }),
    ],
  },
  reports: {
    label: "Reports",
    icon: ChartNoAxesCombined,
    subtitle: "A clearer picture of your hospital.",
  },
  settings: {
    label: "Settings",
    icon: Settings,
    subtitle: "Make Carewell work for your team.",
  },
};
export const initials = (name) =>
  (name || "?")
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
export const formatDate = (
  value,
  options = { day: "numeric", month: "short", year: "numeric" },
) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
        "en-IN",
        options,
      )
    : "—";
export const formatTime = (value) => {
  if (!value) return "—";
  const [h, m] = value.split(":");
  return `${Number(h) % 12 || 12}:${m} ${Number(h) >= 12 ? "PM" : "AM"}`;
};

export const chartColors = [
  "#13877c",
  "#87bdb5",
  "#b4d8d2",
  "#e3ae79",
  "#8b9cb8",
  "#c3accc",
];
