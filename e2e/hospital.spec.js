import { test, expect } from "@playwright/test";
async function login(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
}
async function navigate(page, name) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function cleanup(page, records) {
  const token = await page.evaluate(() =>
    localStorage.getItem("carewell-token"),
  );
  for (const [entity, id] of records)
    await page.request.delete(`/api/${entity}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
}
test("all workspace pages render without browser errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(page.getByText("Total patients", { exact: true })).toBeVisible();
  await expect(page.locator(".activity-chart svg")).toBeVisible();
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  for (const name of [
    "Patients",
    "Appointments",
    "Doctors",
    "Wards & beds",
    "Billing",
    "Pharmacy & stock",
    "Reports",
  ]) {
    await navigate(page, name);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hospital details", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("patient records can be created, edited, searched, exported and deleted", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Patients");
  const name = `QA Patient ${Date.now()}`;
  let id;
  try {
    await page
      .getByRole("button", { name: "Add patient", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Full name").fill(name);
    await dialog.getByLabel("Age", { exact: true }).fill("36");
    await dialog.getByLabel("Phone", { exact: true }).fill("+91 98765 12345");
    const created = page.waitForResponse(
      (res) =>
        res.url().endsWith("/api/patients") &&
        res.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Add patient", exact: true })
      .click();
    const response = await created;
    expect(response.status()).toBe(201);
    id = (await response.json()).id;
    await expect(dialog).toBeHidden();
    await page
      .getByRole("textbox", { name: "Search patients", exact: true })
      .fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: `Edit ${name}`, exact: true })
      .click();
    await dialog.getByLabel("Reason for visit").fill("Annual check-up");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText("Annual check-up", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `View ${name}`, exact: true })
      .click();
    await expect(
      dialog.getByText("Annual check-up", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export", exact: true }).click();
    expect((await download).suggestedFilename()).toContain("patients");
    await page
      .getByRole("button", { name: `Delete ${name}`, exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Delete record", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(name, { exact: true })).toBeHidden();
    id = null;
  } finally {
    if (id) await cleanup(page, [["patients", id]]);
  }
});
test("appointment, bed assignment and invoice forms save to the backend", async ({
  page,
}) => {
  await login(page);
  const records = [];
  const token = await page.evaluate(() =>
    localStorage.getItem("carewell-token"),
  );
  const headers = { Authorization: `Bearer ${token}` };
  const patient = await (
    await page.request.post("/api/patients", {
      headers,
      data: { name: `QA Workflow ${Date.now()}`, age: 29, gender: "Female" },
    })
  ).json();
  records.push(["patients", patient.id]);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Good / })).toBeVisible();
  try {
    await navigate(page, "Appointments");
    await page
      .getByRole("button", { name: "Add appointment", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Patient", { exact: true })
      .selectOption(patient.id);
    const doctors = await (
      await page.request.get("/api/doctors", { headers })
    ).json();
    await dialog
      .getByLabel("Doctor", { exact: true })
      .selectOption(doctors.find((d) => d.status === "Available").id);
    await dialog.getByLabel("Appointment date").fill("2031-06-15");
    await dialog.getByLabel("Time", { exact: true }).fill("15:45");
    const appointmentRes = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/appointments") &&
        r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Add appointment", exact: true })
      .click();
    const appointment = await appointmentRes;
    expect(appointment.status()).toBe(201);
    records.unshift(["appointments", (await appointment.json()).id]);
    await expect(dialog).toBeHidden();
    await navigate(page, "Wards & beds");
    await page.getByRole("button", { name: "Add bed", exact: true }).click();
    await dialog.getByLabel("Bed / room number").fill(`QA-${Date.now()}`);
    await dialog.getByLabel("Bed status").selectOption("Occupied");
    await dialog.getByLabel("Assigned patient").selectOption(patient.id);
    const bedRes = page.waitForResponse(
      (r) => r.url().endsWith("/api/rooms") && r.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Add bed", exact: true }).click();
    const bed = await bedRes;
    expect(bed.status()).toBe(201);
    const bedRow = await bed.json();
    await expect(dialog).toBeHidden();
    // Release the test bed so cleanup cannot leave an admission behind.
    await page.request.put(`/api/rooms/${bedRow.id}`, {
      headers,
      data: { ...bedRow, status: "Available", patientId: "" },
    });
    records.unshift(["rooms", bedRow.id]);
    const currentPatient = await (
      await page.request.get(`/api/patients/${patient.id}`, { headers })
    ).json();
    expect(currentPatient.status).toBe("Discharged");
    await navigate(page, "Billing");
    await page
      .getByRole("button", { name: "Add invoice", exact: true })
      .click();
    await dialog
      .getByLabel("Patient", { exact: true })
      .selectOption(patient.id);
    await dialog
      .getByLabel("Description", { exact: true })
      .fill("QA consultation");
    await dialog.getByLabel("Amount", { exact: true }).fill("750");
    await dialog.getByLabel("Payment status").selectOption("Paid");
    const invoiceRes = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/invoices") && r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Add invoice", exact: true })
      .click();
    const invoice = await invoiceRes;
    expect(invoice.status()).toBe(201);
    records.unshift(["invoices", (await invoice.json()).id]);
    await expect(dialog).toBeHidden();
  } finally {
    await cleanup(page, records);
  }
});
test("mobile navigation and layouts fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.waitForTimeout(1200);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/dashboard-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await navigate(page, "Patients");
  await expect(
    page.getByRole("heading", { name: "Patients", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add patient", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
