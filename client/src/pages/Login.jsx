import { useState } from "react";
import {
  CheckCircle2,
  HeartPulse,
  Plus,
  ShieldCheck,
  Heart,
  ArrowRight,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { api } from "../api";
import { Brand } from "../components/ui";

export function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@carewell.test");
  const [password, setPassword] = useState("Carewell123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      localStorage.setItem("carewell-token", result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-story">
        <Brand large />
        <div className="login-story-content">
          <span className="eyebrow light">A LITTLE MORE CONNECTED</span>
          <h1>
            Better days.
            <br />
            Better care.
          </h1>
          <p>
            More time for your patients.
            <br />A simpler way to manage everything else.
          </p>
          <div className="care-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-cross">
              <Plus size={84} strokeWidth={2.5} />
            </div>
            <span className="art-pill art-pulse">
              <HeartPulse size={22} /> Patient care, first.
            </span>
            <span className="art-pill art-check">
              <CheckCircle2 size={21} /> Every detail in place
            </span>
          </div>
        </div>
        <p className="login-story-footer">
          <Heart size={14} /> Thoughtfully built for everyday care.
        </p>
      </div>
      <div className="login-main">
        <div className="login-form-wrap">
          <span className="eyebrow">YOUR WORKDAY STARTS HERE</span>
          <h2>Welcome back.</h2>
          <p className="muted">Sign in to your hospital workspace.</p>
          <form onSubmit={submit} className="login-form">
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                <AlertCircle size={16} />
                {error}
              </p>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="demo-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Your demo is ready</strong>
              <p>
                Sample records are included. Use the prefilled credentials to
                explore and add your own data.
              </p>
              <code>admin@carewell.test · Carewell123!</code>
            </div>
          </div>
          <p className="login-small">
            A simple workspace. A healthier workflow.
          </p>
        </div>
      </div>
    </main>
  );
}
