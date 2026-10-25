import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
export function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const record = (data) => ({
  id: randomUUID(),
  ...data,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export async function seedData() {
  const names = [
    "Ananya Sharma",
    "Rahul Mehta",
    "Priya Nair",
    "Arjun Kapoor",
    "Meera Patel",
    "Vikram Singh",
    "Isha Verma",
    "Rohan Das",
    "Kavya Rao",
    "Aditya Joshi",
    "Sneha Reddy",
    "Aarav Gupta",
  ];
  const conditions = [
    "Routine check-up",
    "Hypertension",
    "Migraine",
    "Knee pain",
    "Seasonal allergies",
    "Post-operative care",
    "Annual screening",
    "Back pain",
    "Fever",
    "Diabetes follow-up",
    "Skin consultation",
    "Routine check-up",
  ];
  const patients = names.map((name, i) =>
    record({
      name,
      age: [28, 45, 32, 56, 24, 62, 35, 41, 19, 53, 30, 38][i],
      gender: i % 2 ? "Male" : "Female",
      phone: `+91 98765 ${String(43210 + i).padStart(5, "0")}`,
      email: `${name.split(" ")[0].toLowerCase()}@example.com`,
      bloodGroup: ["B+", "O+", "A+", "AB+", "O-", "B+"][i % 6],
      address: `${12 + i}, Park Avenue, Bengaluru`,
      emergencyContact: "+91 98765 00000",
      condition: conditions[i],
      status: [1, 3, 5, 7].includes(i) ? "Admitted" : "Outpatient",
      notes: "Sample patient record. Replace with your own information.",
    }),
  );
  const doctors = [
    ["Dr. Sarah Thomas", "General Medicine", "MBBS, MD", 12],
    ["Dr. Amit Verma", "Cardiology", "MBBS, DM", 16],
    ["Dr. Neha Kapoor", "Neurology", "MBBS, DM", 10],
    ["Dr. Rajesh Iyer", "Orthopedics", "MBBS, MS", 14],
    ["Dr. Maya Nair", "Pediatrics", "MBBS, MD", 9],
    ["Dr. Aisha Khan", "Dermatology", "MBBS, MD", 8],
  ].map(([name, department, qualification, experience], i) =>
    record({
      name,
      department,
      qualification,
      experience,
      phone: `+91 98765 1000${i}`,
      email: `doctor${i + 1}@carewell.test`,
      fee: 500 + i * 100,
      status: i === 4 ? "On leave" : i === 1 ? "In consultation" : "Available",
      notes: "Sample staff profile.",
    }),
  );
  const appointments = Array.from({ length: 30 }, (_, i) =>
    record({
      patientId: patients[i % 12].id,
      doctorId: doctors[[0, 1, 2, 3, 5][i % 5]].id,
      date: localDate(i < 10 ? 0 : i < 18 ? 1 : -((i % 7) + 1)),
      time: `${String(9 + Math.floor(i / 5)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
      type: ["Consultation", "Follow-up", "Check-up"][i % 3],
      status:
        i < 10
          ? ["Scheduled", "Checked in", "Scheduled", "Completed", "Cancelled"][
              i % 5
            ]
          : i < 18
            ? "Scheduled"
            : "Completed",
      reason: conditions[i % 12],
      notes: "",
    }),
  );
  const rooms = Array.from({ length: 12 }, (_, i) =>
    record({
      name: `${i < 6 ? "GW" : i < 9 ? "PR" : "ICU"}-${String(i + 1).padStart(2, "0")}`,
      type: i < 6 ? "General Ward" : i < 9 ? "Private Room" : "ICU",
      floor: i < 6 ? "Ground floor" : i < 9 ? "First floor" : "Second floor",
      dailyRate: i < 6 ? 1200 : i < 9 ? 3500 : 6500,
      status: i < 4 ? "Occupied" : i === 10 ? "Maintenance" : "Available",
      patientId: i < 4 ? patients[[1, 3, 5, 7][i]].id : "",
      notes: "",
    }),
  );
  const invoices = Array.from({ length: 16 }, (_, i) =>
    record({
      patientId: patients[i % 12].id,
      description: [
        "Consultation & diagnostics",
        "Room charges",
        "Consultation fee",
        "Laboratory tests",
      ][i % 4],
      amount: [1500, 7200, 800, 2400, 3600, 1200][i % 6],
      status: i % 5 === 0 ? "Overdue" : i % 3 === 0 ? "Pending" : "Paid",
      date: localDate(i % 5 === 0 ? -10 : -(i % 7)),
      dueDate: localDate(i % 5 === 0 ? -1 : 7),
      paymentMethod: ["UPI", "Card", "Cash", "Insurance"][i % 4],
      notes: "",
    }),
  );
  const inventory = [
    ["Paracetamol 500mg", "Medicine", 240, "tablets", 50, 2],
    ["Amoxicillin 250mg", "Medicine", 18, "capsules", 30, 8],
    ["Surgical gloves", "Consumable", 480, "pairs", 100, 12],
    ["Digital thermometer", "Equipment", 24, "units", 10, 250],
    ["Normal saline 500ml", "Medicine", 12, "bottles", 25, 45],
    ["Sterile gauze", "Consumable", 160, "packs", 40, 30],
    ["Blood pressure monitor", "Equipment", 8, "units", 5, 1800],
    ["Cetirizine 10mg", "Medicine", 120, "tablets", 30, 4],
  ].map(([name, category, quantity, unit, reorderLevel, unitPrice]) =>
    record({
      name,
      category,
      quantity,
      unit,
      reorderLevel,
      unitPrice,
      supplier: "MedSupply India",
      expiryDate: category === "Medicine" ? localDate(365) : "",
      notes: "",
    }),
  );
  return {
    patients,
    doctors,
    appointments,
    rooms,
    invoices,
    inventory,
    settings: [
      record({
        hospitalName: "Carewell Hospital",
        tagline: "Care that puts people first.",
        address: "24, Residency Road, Bengaluru, Karnataka 560025",
        phone: "+91 80 4567 8900",
        email: "hello@carewell.test",
        currency: "INR",
      }),
    ],
    users: [
      record({
        name: "Alex Morgan",
        email: process.env.ADMIN_EMAIL || "admin@carewell.test",
        password: await bcrypt.hash(
          process.env.ADMIN_PASSWORD || "Carewell123!",
          12,
        ),
        role: "Administrator",
      }),
    ],
  };
}
