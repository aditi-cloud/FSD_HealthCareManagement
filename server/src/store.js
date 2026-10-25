import mongoose from "mongoose";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { schemas } from "./schemas.js";
import { seedData } from "./seed.js";
const keys = [...Object.keys(schemas), "settings", "users"];
const models = Object.fromEntries(
  keys.map((key) => [
    key,
    mongoose.models[key] ||
      mongoose.model(
        key,
        new mongoose.Schema(
          {
            _id: String,
            data: { type: mongoose.Schema.Types.Mixed, required: true },
          },
          { versionKey: false },
        ),
      ),
  ]),
);
export async function createStore({
  mode = process.env.DATA_MODE || "auto",
  file = process.env.DATA_FILE ||
    fileURLToPath(new URL("../../data/store.json", import.meta.url)),
  uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/carewell",
} = {}) {
  let mongo = false;
  if (mode !== "json") {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
      mongo = true;
    } catch (error) {
      if (mode === "mongo" || process.env.MONGODB_URI) throw error;
      console.log(
        "MongoDB unavailable. Using the persistent local demo store.",
      );
    }
  }
  let data;
  if (!mongo) {
    try {
      data = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      data = await seedData();
      await mkdir(dirname(resolve(file)), { recursive: true });
      await writeFile(file, JSON.stringify(data, null, 2));
    }
  } else {
    if (!(await models.users.countDocuments())) {
      const seed = await seedData();
      for (const key of keys)
        if (!(await models[key].countDocuments()))
          await models[key].insertMany(
            seed[key].map((r) => ({ _id: r.id, data: r })),
          );
    }
  }
  let queue = Promise.resolve();
  const persist = () => {
    queue = queue
      .catch(() => {})
      .then(async () => {
        const snapshot = JSON.stringify(data, null, 2);
        await writeFile(`${file}.tmp`, snapshot);
        await rename(`${file}.tmp`, file);
      });
    return queue;
  };
  return {
    mode: mongo ? "MongoDB" : "Local demo",
    async all(key) {
      return mongo
        ? (await models[key].find().lean()).map((r) => r.data)
        : structuredClone(data[key]);
    },
    async get(key, id) {
      return mongo
        ? (await models[key].findById(id).lean())?.data
        : structuredClone(data[key].find((r) => r.id === id));
    },
    async save(key, value, id) {
      const now = new Date().toISOString();
      const old = id ? await this.get(key, id) : null;
      const row = {
        ...value,
        id: id || randomUUID(),
        createdAt: old?.createdAt || now,
        updatedAt: now,
      };
      if (mongo)
        await models[key].replaceOne(
          { _id: row.id },
          { _id: row.id, data: row },
          { upsert: true },
        );
      else {
        const index = data[key].findIndex((r) => r.id === row.id);
        if (index < 0) data[key].push(row);
        else data[key][index] = row;
        await persist();
      }
      return row;
    },
    async remove(key, id) {
      if (mongo) await models[key].deleteOne({ _id: id });
      else {
        data[key] = data[key].filter((r) => r.id !== id);
        await persist();
      }
    },
    async close() {
      await queue;
      if (mongo) await mongoose.disconnect();
    },
  };
}
