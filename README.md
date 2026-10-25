# Carewell Hospital Management

A simple, complete MERN application for hospital administration. React and Vite power the frontend; Express, Node.js and Mongoose power the API. MongoDB stores the records. The app also includes a persistent JSON demo store when local MongoDB is unavailable.

## Run locally

Requires Node.js 22.12+ and npm. Dependencies are already installed in this workspace.

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs at **http://127.0.0.1:5001**.

Sign in with:

```text
Email:    admin@carewell.test
Password: Carewell123!
```

Sample patients, doctors, appointments, beds, invoices and inventory are created automatically on the first run. They are fictional and can be edited or removed. Data persists across restarts.

## MongoDB and configuration

The default database is `mongodb://127.0.0.1:27017/carewell`. If MongoDB is already running, the app connects automatically. Otherwise it falls back to a JSON file at `data/store.json` so you can explore immediately.

If MongoDB Community Server is installed but stopped, run this in a separate terminal:

```bash
npm run db
```

Restart the app after starting MongoDB. MongoDB and JSON are separate stores; switching modes does not migrate their data.

For custom configuration, copy the example:

```bash
cp server/.env.example server/.env
```

| Variable                        | Purpose                                                                                                                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`                   | Local or MongoDB Atlas connection string. If explicitly set, connection failures stop startup instead of falling back. |
| `DATA_MODE`                     | `auto` (default), `mongo` (require MongoDB), or `json` (local demo store).                                             |
| `DATA_FILE`                     | Optional absolute path for the JSON store.                                                                             |
| `JWT_SECRET`                    | Signing secret. Development generates a new secret per server start if omitted.                                        |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial account credentials, used only when creating the database for the first time.                                  |
| `PORT`                          | API port, default `5001`. Update the Vite proxy if changing this for development.                                      |
| `CLIENT_ORIGIN`                 | Allowed frontend origin(s), comma separated. Default allows localhost and 127.0.0.1 on port 5173.                      |

Change the demo password in Settings before using your own records. This is an educational administration app with one administrator account; clinical decision support, multi-user roles, audit logging, regulatory compliance and payment processing are outside its scope.

## Features

- **Overview:** live totals, visit activity, today's schedule, care team and bed occupancy.
- **Patients:** contact details, age, blood group, reason for visit, notes and related appointment/billing history.
- **Appointments:** patient/doctor selection, date and time, visit type and status. Conflicting doctor or patient time slots are rejected.
- **Doctors:** qualifications, department, experience, consultation fee and availability.
- **Wards & beds:** room types, floor, daily rate and patient assignments. Assigning a bed admits a patient; releasing it discharges them. A patient cannot occupy two beds.
- **Billing:** invoice records, due dates, payment status and method; printable invoices. Payment status is entered manually.
- **Pharmacy & stock:** quantities, reorder thresholds, unit prices, suppliers and expiry dates; low stock notifications.
- **Reports:** revenue, collections, appointment distribution and an operations snapshot.
- **Settings:** hospital identity, invoice contact details, display currency, administrator name and password.
- Global search, filters, pagination, CSV exports, confirmation dialogs, form validation and phone layouts.

Changing display currency changes formatting only; it does not convert stored amounts. Linked patients and doctors cannot be deleted until dependent records are removed.

## Commands

```bash
npm run dev          # Frontend and API with reload
npm run build        # Production frontend build
npm start            # API + built frontend at http://127.0.0.1:5001
npm test             # 12 isolated API tests; does not modify the app database
npm run test:e2e     # Browser workflow tests; requires Playwright Chromium
npm run format      # Format the source
npm run format:check
```

For browser tests, install Chromium once with `npx playwright install chromium`. To use an existing Google Chrome installation, run `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Browser tests create temporary records in the running app and clean them up. The default demo account must still be available for these tests. Screenshots are saved in `artifacts/`.

## Project layout

```text
client/
  src/App.jsx         Authentication, app shell and shared data
  src/pages/          Dashboard, records, reports, login and settings screens
  src/components/     Reusable UI, record forms and detail dialogs
  src/config.js       Navigation, form definitions and display helpers
  src/api.js          Authenticated API requests and CSV export
  src/styles.css      Responsive interface and invoice print styles
server/
  src/app.js          Authentication, CRUD API and relationship rules
  src/store.js        Mongoose persistence and local JSON demo adapter
  src/schemas.js      Server-side validation for every record type
  src/seed.js         Fictional sample records
  src/index.js        Server startup
  test/api.test.js    API behavior and persistence tests
e2e/                  Browser workflow tests
scripts/mongo.mjs     Optional local MongoDB launcher
```

## API

`GET /api/health` is public. `POST /api/auth/login` returns a JWT; send it as `Authorization: Bearer <token>` for other endpoints. Sessions expire after 12 hours.

Each of `patients`, `doctors`, `appointments`, `rooms`, `invoices` and `inventory` provides:

```text
GET    /api/:entity
GET    /api/:entity/:id
POST   /api/:entity
PUT    /api/:entity/:id
DELETE /api/:entity/:id
```

Additional endpoints: `GET /api/auth/me`, `PUT /api/auth/profile`, and `GET/PUT /api/settings`. Validation failures return `400`, missing records `404`, and relationship or scheduling conflicts `409`. Deletions return `204`. Monetary amounts are stored as simple numeric values for this demo.
