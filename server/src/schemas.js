import { z } from "zod";
const text = (max = 200) => z.string().trim().max(max);
const required = (max = 100) => text(max).min(1, "This field is required");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Invalid date",
  );
const phone = text(30).default("");
export const departments = [
  "General Medicine",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Dermatology",
  "Emergency",
];
export const schemas = {
  patients: z.object({
    name: required(),
    age: z.coerce.number().int().min(0).max(130),
    gender: z.enum(["Female", "Male", "Other"]),
    phone,
    email: z.union([z.email(), z.literal("")]).default(""),
    bloodGroup: z
      .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"])
      .default("Unknown"),
    address: text(500).default(""),
    emergencyContact: text().default(""),
    condition: text().default(""),
    status: z
      .enum(["Outpatient", "Admitted", "Discharged"])
      .default("Outpatient"),
    notes: text(3000).default(""),
  }),
  doctors: z.object({
    name: required(),
    department: z.enum(departments),
    qualification: text().default("MBBS"),
    experience: z.coerce.number().int().min(0).max(70).default(0),
    phone,
    email: z.union([z.email(), z.literal("")]).default(""),
    fee: z.coerce.number().min(0).max(100000).default(500),
    status: z
      .enum(["Available", "On leave", "In consultation"])
      .default("Available"),
    notes: text(3000).default(""),
  }),
  appointments: z.object({
    patientId: required(),
    doctorId: required(),
    date,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time"),
    type: z
      .enum(["Consultation", "Follow-up", "Check-up", "Emergency"])
      .default("Consultation"),
    status: z
      .enum(["Scheduled", "Checked in", "Completed", "Cancelled"])
      .default("Scheduled"),
    reason: text(500).default(""),
    notes: text(3000).default(""),
  }),
  rooms: z
    .object({
      name: required(),
      type: z.enum(["General Ward", "Private Room", "ICU", "Emergency"]),
      floor: text(50).default("Ground floor"),
      dailyRate: z.coerce.number().min(0).max(1000000),
      status: z
        .enum(["Available", "Occupied", "Maintenance"])
        .default("Available"),
      patientId: text().default(""),
      notes: text(3000).default(""),
    })
    .refine(
      (r) => (r.status === "Occupied" ? Boolean(r.patientId) : !r.patientId),
      {
        message: "Assign a patient only when the bed is occupied",
        path: ["patientId"],
      },
    ),
  invoices: z
    .object({
      patientId: required(),
      description: required(500),
      amount: z.coerce.number().min(1).max(100000000),
      status: z.enum(["Paid", "Pending", "Overdue"]).default("Pending"),
      date,
      dueDate: date,
      paymentMethod: z
        .enum(["Cash", "Card", "UPI", "Insurance", "Bank transfer"])
        .default("UPI"),
      notes: text(3000).default(""),
    })
    .refine((r) => r.dueDate >= r.date, {
      message: "Due date cannot be before invoice date",
      path: ["dueDate"],
    }),
  inventory: z.object({
    name: required(),
    category: z.enum(["Medicine", "Equipment", "Consumable"]),
    quantity: z.coerce.number().int().min(0).max(1000000),
    unit: text(40).default("units"),
    reorderLevel: z.coerce.number().int().min(0).max(100000).default(20),
    unitPrice: z.coerce.number().min(0).max(1000000).default(0),
    supplier: text().default(""),
    expiryDate: z.union([date, z.literal("")]).default(""),
    notes: text(3000).default(""),
  }),
};
export const settingsSchema = z.object({
  hospitalName: required(),
  tagline: text().default("Care that puts people first."),
  address: text(500),
  phone,
  email: z.email(),
  currency: z.enum(["INR", "USD", "EUR"]).default("INR"),
});
