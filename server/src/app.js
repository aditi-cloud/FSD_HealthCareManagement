import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { z } from "zod";
import { schemas, settingsSchema } from "./schemas.js";
const httpError = (status, message) =>
  Object.assign(new Error(message), { status });
export function createApp(store) {
  const app = express();
  const secret = process.env.JWT_SECRET || randomBytes(48).toString("hex");
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN
        ? process.env.CLIENT_ORIGIN.split(",")
        : ["http://127.0.0.1:5173", "http://localhost:5173"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", storage: store.mode }),
  );
  app.post(
    "/api/auth/login",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    async (req, res) => {
      const input = z
        .object({ email: z.email(), password: z.string().min(1).max(200) })
        .parse(req.body);
      const user = (await store.all("users")).find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase(),
      );
      if (!user || !(await bcrypt.compare(input.password, user.password)))
        throw httpError(401, "Incorrect email or password.");
      res.json({
        token: jwt.sign({ sub: user.id }, secret, { expiresIn: "12h" }),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    },
  );
  app.use("/api", async (req, _res, next) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer /, "");
      const payload = jwt.verify(token || "", secret);
      const user = await store.get("users", payload.sub);
      if (!user) throw new Error();
      req.user = user;
      next();
    } catch {
      next(httpError(401, "Please sign in to continue."));
    }
  });
  app.get("/api/auth/me", (req, res) => {
    const { password, ...user } = req.user;
    res.json(user);
  });
  app.get("/api/settings", async (_req, res) =>
    res.json((await store.all("settings"))[0]),
  );
  app.put("/api/settings", async (req, res) => {
    const input = settingsSchema.parse(req.body);
    const current = (await store.all("settings"))[0];
    res.json(await store.save("settings", input, current.id));
  });
  app.put("/api/auth/profile", async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(100),
        currentPassword: z.string().max(200).optional(),
        newPassword: z.string().min(8).max(200).optional(),
      })
      .parse(req.body);
    if (
      input.newPassword &&
      !(await bcrypt.compare(input.currentPassword || "", req.user.password))
    )
      throw httpError(400, "Current password is incorrect.");
    const value = { ...req.user, name: input.name };
    if (input.newPassword)
      value.password = await bcrypt.hash(input.newPassword, 12);
    const { password, ...user } = await store.save("users", value, req.user.id);
    res.json(user);
  });
  // Serialize writes so conflict checks and the resulting writes remain ordered.
  let mutations = Promise.resolve();
  function mutate(fn) {
    const result = mutations.then(fn);
    mutations = result.catch(() => {});
    return result;
  }
  async function validateRelations(entity, row, id) {
    if (row.patientId && !(await store.get("patients", row.patientId)))
      throw httpError(400, "Select an existing patient.");
    if (entity === "appointments") {
      const doctor = await store.get("doctors", row.doctorId);
      if (!doctor) throw httpError(400, "Select an existing doctor.");
      const active = row.status !== "Cancelled";
      if (active && doctor.status === "On leave")
        throw httpError(409, "This doctor is on leave. Choose another doctor.");
      const others = (await store.all("appointments")).filter(
        (a) =>
          a.id !== id &&
          a.status !== "Cancelled" &&
          a.date === row.date &&
          a.time === row.time,
      );
      if (active && others.some((a) => a.doctorId === row.doctorId))
        throw httpError(
          409,
          "This doctor already has an appointment at that time.",
        );
      if (active && others.some((a) => a.patientId === row.patientId))
        throw httpError(
          409,
          "This patient already has an appointment at that time.",
        );
    }
    if (entity === "rooms") {
      const rooms = await store.all("rooms");
      if (
        rooms.some(
          (r) => r.id !== id && r.name.toLowerCase() === row.name.toLowerCase(),
        )
      )
        throw httpError(409, "A bed with this name already exists.");
      if (
        row.patientId &&
        rooms.some((r) => r.id !== id && r.patientId === row.patientId)
      )
        throw httpError(409, "This patient already has an assigned bed.");
    }
    if (
      entity === "patients" &&
      row.status !== "Admitted" &&
      (await store.all("rooms")).some((r) => r.patientId === id)
    )
      throw httpError(
        409,
        "Release this patient’s bed before changing their admission status.",
      );
  }
  async function syncRoom(row, previous) {
    if (previous?.patientId && previous.patientId !== row.patientId) {
      const patient = await store.get("patients", previous.patientId);
      if (patient)
        await store.save(
          "patients",
          { ...patient, status: "Discharged" },
          patient.id,
        );
    }
    if (row.patientId) {
      const patient = await store.get("patients", row.patientId);
      await store.save(
        "patients",
        { ...patient, status: "Admitted" },
        patient.id,
      );
    }
  }
  for (const [entity, schema] of Object.entries(schemas)) {
    app.get(`/api/${entity}`, async (_req, res) =>
      res.json(await store.all(entity)),
    );
    app.get(`/api/${entity}/:id`, async (req, res) => {
      const row = await store.get(entity, req.params.id);
      if (!row) throw httpError(404, "Record not found.");
      res.json(row);
    });
    app.post(`/api/${entity}`, async (req, res) => {
      const row = await mutate(async () => {
        const input = schema.parse(req.body);
        await validateRelations(entity, input);
        const saved = await store.save(entity, input);
        if (entity === "rooms") await syncRoom(saved);
        return saved;
      });
      res.status(201).json(row);
    });
    app.put(`/api/${entity}/:id`, async (req, res) =>
      res.json(
        await mutate(async () => {
          const old = await store.get(entity, req.params.id);
          if (!old) throw httpError(404, "Record not found.");
          const input = schema.parse(req.body);
          await validateRelations(entity, input, req.params.id);
          const row = await store.save(entity, input, req.params.id);
          if (entity === "rooms") await syncRoom(row, old);
          return row;
        }),
      ),
    );
    app.delete(`/api/${entity}/:id`, async (req, res) => {
      await mutate(async () => {
        const old = await store.get(entity, req.params.id);
        if (!old) throw httpError(404, "Record not found.");
        if (entity === "patients") {
          for (const key of ["appointments", "rooms", "invoices"])
            if ((await store.all(key)).some((r) => r.patientId === old.id))
              throw httpError(
                409,
                "This patient has linked appointments, beds or invoices. Remove those records first.",
              );
        }
        if (
          entity === "doctors" &&
          (await store.all("appointments")).some((r) => r.doctorId === old.id)
        )
          throw httpError(
            409,
            "This doctor has linked appointments. Remove those records first.",
          );
        if (entity === "rooms" && old.patientId)
          throw httpError(409, "Release the patient before deleting this bed.");
        await store.remove(entity, old.id);
      });
      res.status(204).end();
    });
  }
  app.use("/api", (_req, _res, next) =>
    next(httpError(404, "API endpoint not found.")),
  );
  const dist = fileURLToPath(new URL("../../client/dist", import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) => res.sendFile(`${dist}/index.html`));
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        message: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({
      message:
        status >= 500
          ? "Something went wrong. Please try again."
          : error.message,
    });
  });
  return app;
}
