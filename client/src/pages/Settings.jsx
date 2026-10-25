import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { PanelHeading } from "../components/ui";

export function Settings({ data, user, onSettings, onProfile, notify }) {
  const [values, setValues] = useState(data.settings);
  const [profile, setProfile] = useState({
    name: user.name,
    currentPassword: "",
    newPassword: "",
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState({});
  async function saveSettings(e) {
    e.preventDefault();
    setBusy("hospital");
    setError((old) => ({ ...old, hospital: "" }));
    try {
      onSettings(await api("/settings", { method: "PUT", body: values }));
    } catch (err) {
      setError((old) => ({ ...old, hospital: err.message }));
    } finally {
      setBusy("");
    }
  }
  async function saveProfile(e) {
    e.preventDefault();
    setBusy("profile");
    setError((old) => ({ ...old, profile: "" }));
    try {
      const body = {
        name: profile.name,
        ...(profile.newPassword
          ? {
              currentPassword: profile.currentPassword,
              newPassword: profile.newPassword,
            }
          : {}),
      };
      const result = await api("/auth/profile", { method: "PUT", body });
      onProfile(result);
      setProfile({ ...profile, currentPassword: "", newPassword: "" });
      notify("Profile updated.");
    } catch (err) {
      setError((old) => ({ ...old, profile: err.message }));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="settings-layout">
      <div>
        <section className="panel settings-panel">
          <PanelHeading
            title="Hospital details"
            subtitle="The essentials that appear across your workspace and invoices."
          />
          <form onSubmit={saveSettings}>
            <div className="form-grid">
              {[
                ["hospitalName", "Hospital name"],
                ["tagline", "Tagline"],
                ["phone", "Phone number"],
                ["email", "Email address"],
                ["address", "Address"],
              ].map(([key, label]) => (
                <label className={key === "address" ? "wide" : ""} key={key}>
                  {label}
                  <input
                    required={key !== "tagline"}
                    type={key === "email" ? "email" : "text"}
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Currency
                <select
                  value={values.currency}
                  onChange={(e) =>
                    setValues({ ...values, currency: e.target.value })
                  }
                >
                  <option value="INR">INR · Indian Rupee</option>
                  <option value="USD">USD · US Dollar</option>
                  <option value="EUR">EUR · Euro</option>
                </select>
              </label>
            </div>
            {error.hospital && (
              <p className="form-error" role="alert">
                {error.hospital}
              </p>
            )}
            <div className="settings-footer">
              <button className="button primary" disabled={!!busy}>
                <Check size={16} />
                {busy === "hospital" ? "Saving…" : "Save hospital details"}
              </button>
            </div>
          </form>
        </section>
        <section className="panel settings-panel">
          <PanelHeading
            title="Your profile"
            subtitle="Personalize your account and update your password."
          />
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <label>
                Your name
                <input
                  required
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
              </label>
              <label>
                Email address
                <input disabled value={user.email} />
              </label>
              <label>
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required={!!profile.newPassword}
                  value={profile.currentPassword}
                  onChange={(e) =>
                    setProfile({ ...profile, currentPassword: e.target.value })
                  }
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={profile.newPassword}
                  onChange={(e) =>
                    setProfile({ ...profile, newPassword: e.target.value })
                  }
                />
              </label>
            </div>
            <p className="field-hint">
              Leave password fields empty to keep your current password.
            </p>
            {error.profile && (
              <p className="form-error" role="alert">
                {error.profile}
              </p>
            )}
            <div className="settings-footer">
              <button className="button primary" disabled={!!busy}>
                <Check size={16} />
                {busy === "profile" ? "Saving…" : "Update profile"}
              </button>
            </div>
          </form>
        </section>
      </div>
      <aside className="settings-aside">
        <span className="settings-large-icon">
          <ShieldCheck size={30} />
        </span>
        <h3>Your workspace, connected.</h3>
        <p>
          Hospital details help keep records and printed invoices consistent for
          your team.
        </p>
        <div className="storage-status">
          <span className="live-dot" />
          <span>
            {data.storage === "MongoDB"
              ? "Connected to MongoDB"
              : "Local demo storage active"}
          </span>
        </div>
        <p className="settings-version">
          Carewell Hospital Management
          <br />
          Version 1.0.0 · MERN application
        </p>
      </aside>
    </div>
  );
}
