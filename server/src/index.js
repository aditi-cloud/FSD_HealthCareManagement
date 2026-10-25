import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";
import { createApp } from "./app.js";
dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});
const store = await createStore();
const port = Number(process.env.PORT) || 5001;
const server = createApp(store).listen(port, "127.0.0.1", () =>
  console.log(`Carewell API: http://127.0.0.1:${port} · ${store.mode}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await store.close();
      process.exit(0);
    }),
  );
