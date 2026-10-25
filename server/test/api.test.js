import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";

let folder, store, app, token;
const auth = () => ({ Authorization: `Bearer ${token}` });
before(async () => {
  folder = await mkdtemp(join(tmpdir(), "carewell-test-"));
  store = await createStore({ mode: "json", file: join(folder, "store.json") });
  app = createApp(store);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@carewell.test", password: "Carewell123!" });
  assert.equal(res.status, 200);
  token = res.body.token;
});
after(async () => {
  await store?.close();
  await rm(folder, { recursive: true, force: true });
});
test("health is public, patient records require authentication", async () => {
  assert.equal((await request(app).get("/api/health")).status, 200);
  assert.equal((await request(app).get("/api/patients")).status, 401);
  assert.equal(
    (await request(app).get("/api/patients").set(auth())).status,
    200,
  );
});
test("invalid credentials and malformed records are rejected", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@carewell.test", password: "wrong" })
    ).status,
    401,
  );
  const res = await request(app)
    .post("/api/patients")
    .set(auth())
    .send({ name: "Invalid", age: -1, gender: "Female" });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /age/);
});
test("patient create, update, detail and delete persist correctly", async () => {
  const res = await request(app)
    .post("/api/patients")
    .set(auth())
    .send({ name: "Test Patient", age: 30, gender: "Female" });
  assert.equal(res.status, 201);
  const updated = await request(app)
    .put(`/api/patients/${res.body.id}`)
    .set(auth())
    .send({
      ...res.body,
      name: "Updated Patient",
      notes: "Follow-up scheduled",
    });
  assert.equal(updated.status, 200);
  assert.equal(
    (await store.get("patients", res.body.id)).name,
    "Updated Patient",
  );
  assert.equal(
    (await request(app).get(`/api/patients/${res.body.id}`).set(auth())).body
      .notes,
    "Follow-up scheduled",
  );
  assert.equal(
    (await request(app).delete(`/api/patients/${res.body.id}`).set(auth()))
      .status,
    204,
  );
  assert.equal(
    (await request(app).get(`/api/patients/${res.body.id}`).set(auth())).status,
    404,
  );
});
test("doctor and patient time conflicts are rejected; cancellation frees the time", async () => {
  const patients = await store.all("patients");
  const doctors = (await store.all("doctors")).filter(
    (r) => r.status !== "On leave",
  );
  const value = {
    patientId: patients[0].id,
    doctorId: doctors[0].id,
    date: "2030-01-12",
    time: "09:00",
  };
  const first = await request(app)
    .post("/api/appointments")
    .set(auth())
    .send(value);
  assert.equal(first.status, 201);
  const duplicate = await request(app)
    .post("/api/appointments")
    .set(auth())
    .send({ ...value, patientId: patients[1].id });
  assert.equal(duplicate.status, 409);
  assert.match(duplicate.body.message, /doctor already/);
  const patientConflict = await request(app)
    .post("/api/appointments")
    .set(auth())
    .send({ ...value, doctorId: doctors[1].id });
  assert.equal(patientConflict.status, 409);
  await request(app)
    .put(`/api/appointments/${first.body.id}`)
    .set(auth())
    .send({ ...first.body, status: "Cancelled" })
    .expect(200);
  await request(app)
    .post("/api/appointments")
    .set(auth())
    .send(value)
    .expect(201);
});
test("parallel appointment writes preserve the conflict check", async () => {
  const patient = (await store.all("patients"))[0];
  const doctor = (await store.all("doctors"))[0];
  const body = {
    patientId: patient.id,
    doctorId: doctor.id,
    date: "2030-01-13",
    time: "14:00",
  };
  const results = await Promise.all([
    request(app).post("/api/appointments").set(auth()).send(body),
    request(app).post("/api/appointments").set(auth()).send(body),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
});
test("appointments validate dates, references and doctors on leave", async () => {
  const patients = await store.all("patients");
  const doctors = await store.all("doctors");
  const row = {
    patientId: patients[0].id,
    doctorId: doctors[0].id,
    date: "2030-02-30",
    time: "09:00",
  };
  await request(app)
    .post("/api/appointments")
    .set(auth())
    .send(row)
    .expect(400);
  await request(app)
    .post("/api/appointments")
    .set(auth())
    .send({ ...row, date: "2030-01-12", patientId: "missing" })
    .expect(400);
  await request(app)
    .post("/api/appointments")
    .set(auth())
    .send({
      ...row,
      date: "2030-01-12",
      doctorId: doctors.find((d) => d.status === "On leave").id,
    })
    .expect(409);
});
test("beds enforce unique assignments and update admission status", async () => {
  const patient = (await store.all("patients")).find(
    (p) => p.status === "Outpatient",
  );
  const body = {
    name: "TEST-BED",
    type: "Private Room",
    dailyRate: 1200,
    status: "Occupied",
    patientId: patient.id,
  };
  const bed = await request(app)
    .post("/api/rooms")
    .set(auth())
    .send(body)
    .expect(201);
  assert.equal((await store.get("patients", patient.id)).status, "Admitted");
  await request(app)
    .post("/api/rooms")
    .set(auth())
    .send({ ...body, name: "TEST-BED-2" })
    .expect(409);
  await request(app)
    .delete(`/api/rooms/${bed.body.id}`)
    .set(auth())
    .expect(409);
  await request(app)
    .put(`/api/patients/${patient.id}`)
    .set(auth())
    .send({ ...patient, status: "Discharged" })
    .expect(409);
  await request(app)
    .put(`/api/rooms/${bed.body.id}`)
    .set(auth())
    .send({ ...bed.body, status: "Available", patientId: "" })
    .expect(200);
  assert.equal((await store.get("patients", patient.id)).status, "Discharged");
  await request(app)
    .delete(`/api/rooms/${bed.body.id}`)
    .set(auth())
    .expect(204);
});
test("linked patients and doctors cannot be deleted", async () => {
  await request(app)
    .delete(`/api/patients/${(await store.all("patients"))[0].id}`)
    .set(auth())
    .expect(409);
  await request(app)
    .delete(`/api/doctors/${(await store.all("doctors"))[0].id}`)
    .set(auth())
    .expect(409);
});
test("invoices reject negative amounts and due dates before issue date", async () => {
  const patient = (await store.all("patients"))[0];
  const value = {
    patientId: patient.id,
    description: "Test billing",
    amount: 200,
    date: "2030-01-12",
    dueDate: "2030-01-11",
  };
  await request(app).post("/api/invoices").set(auth()).send(value).expect(400);
  await request(app)
    .post("/api/invoices")
    .set(auth())
    .send({ ...value, dueDate: "2030-01-15", amount: -1 })
    .expect(400);
  const invoice = await request(app)
    .post("/api/invoices")
    .set(auth())
    .send({ ...value, dueDate: "2030-01-15", status: "Paid" })
    .expect(201);
  assert.equal(invoice.body.amount, 200);
  await request(app)
    .delete(`/api/invoices/${invoice.body.id}`)
    .set(auth())
    .expect(204);
});
test("inventory and hospital settings support updates", async () => {
  const item = await request(app)
    .post("/api/inventory")
    .set(auth())
    .send({ name: "Test supply", category: "Consumable", quantity: 10 })
    .expect(201);
  const update = await request(app)
    .put(`/api/inventory/${item.body.id}`)
    .set(auth())
    .send({ ...item.body, quantity: 50 })
    .expect(200);
  assert.equal(update.body.quantity, 50);
  const settings = (await request(app).get("/api/settings").set(auth())).body;
  await request(app)
    .put("/api/settings")
    .set(auth())
    .send({ ...settings, hospitalName: "Test Hospital" })
    .expect(200);
  assert.equal((await store.all("settings"))[0].hospitalName, "Test Hospital");
  await request(app)
    .delete(`/api/inventory/${item.body.id}`)
    .set(auth())
    .expect(204);
});
test("password change verifies current password and allows sign-in with new password", async () => {
  await request(app)
    .put("/api/auth/profile")
    .set(auth())
    .send({
      name: "Test Admin",
      currentPassword: "wrong",
      newPassword: "NewPassword123!",
    })
    .expect(400);
  const profile = await request(app)
    .put("/api/auth/profile")
    .set(auth())
    .send({
      name: "Test Admin",
      currentPassword: "Carewell123!",
      newPassword: "NewPassword123!",
    })
    .expect(200);
  assert.equal(profile.body.password, undefined);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@carewell.test", password: "NewPassword123!" })
    .expect(200);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@carewell.test", password: "Carewell123!" })
    .expect(401);
});
test("local data survives closing and reopening the store", async () => {
  await store.close();
  const reopened = await createStore({
    mode: "json",
    file: join(folder, "store.json"),
  });
  assert.equal(
    (await reopened.all("settings"))[0].hospitalName,
    "Test Hospital",
  );
  await reopened.close();
});
