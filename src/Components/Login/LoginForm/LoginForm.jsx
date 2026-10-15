
/* =========================================================
   PROJENIUS ADMIN — LOGIN FORM
   Responsibilities: Credentials, validation and feedback
========================================================= */

import { useState } from "react";

export default function LoginForm({ onLogin }) {
  // SECTION: FORM STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SECTION: SUBMIT CREDENTIALS
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // The parent performs the actual backend request.
      await onLogin(normalizedEmail, password, rememberMe);
    } catch (loginError) {
      setError(
        loginError.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // SECTION: LOGIN FORM UI
  return (
    <section className="pa-login-form-panel">
      <div className="pa-login-form__container">
        <p className="pa-login-form__eyebrow">WELCOME BACK</p>

        <h2 className="pa-login-form__title">Admin sign in</h2>

        <p className="pa-login-form__subtitle">
          Enter your credentials to access your workspace.
        </p>

        <form
          className="pa-login-form"
          onSubmit={handleSubmit}
        >
          {/* SECTION: EMAIL FIELD */}
          <div className="pa-login-form__field">
            <label htmlFor="pa-login-email">
              Email address
            </label>

            <input
              id="pa-login-email"
              type="email"
              autoComplete="username"
              placeholder="Admin email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* SECTION: PASSWORD FIELD */}
          <div className="pa-login-form__field">
            <label htmlFor="pa-login-password">
              Password
            </label>

            <div className="pa-login-form__password-wrap">
              <input
                id="pa-login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                maxLength={1024}
                required
                disabled={isSubmitting}
              />

              <button
                type="button"
                className="pa-login-form__password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                disabled={isSubmitting}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* SECTION: LOGIN OPTIONS */}
          <div className="pa-login-form__options">
            <label className="pa-login-form__remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
                disabled={isSubmitting}
              />

              <span>Remember me</span>
            </label>

            <span className="pa-login-form__secure-label">
              Secure workspace
            </span>
          </div>

          {/* SECTION: ERROR FEEDBACK */}
          {error && (
            <p className="pa-login-form__error" role="alert">
              {error}
            </p>
          )}

          {/* SECTION: SUBMIT BUTTON */}
          <button
            className="pa-login-form__submit"
            type="submit"
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </span>

            <span aria-hidden="true">
              {isSubmitting ? "…" : "→"}
            </span>
          </button>
        </form>

        <a className="pa-login-form__forgot" href="/forgot-password">
          Forgot your password?
        </a>

        <p className="pa-login-form__note">
          Authorized personnel only.
        </p>
      </div>
    </section>
  );
}
