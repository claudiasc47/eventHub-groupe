import { useState } from "react";
import api from "../api";

const fields = [
  { name: "email", label: "Email", type: "email", autoComplete: "email", required: true },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
    required: true,
    minLength: 8,
  },
  {
    name: "pseudo",
    label: "Username",
    type: "text",
    autoComplete: "nickname",
    required: true,
    minLength: 3,
    maxLength: 30,
  },
  { name: "firstName", label: "First name", type: "text", autoComplete: "given-name" },
  { name: "lastName", label: "Last name", type: "text", autoComplete: "family-name" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
  { name: "birthDate", label: "Date of birth", type: "date", autoComplete: "bday" },
];

export default function Register() {
  const [fieldErrors, setFieldErrors] = useState([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const payload = {};
    for (const { name, required } of fields) {
      const value = formData.get(name);
      if (required || value) payload[name] = value;
    }

    setFieldErrors([]);
    setFormError("");
    setIsSubmitting(true);

    try {
      await api.post("/users/register", payload);
      window.location.href = "/login";
    } catch (error) {
      const { code, message, details } = error.response?.data ?? {};
      const fallbackMessage = "Unable to create the account. Please try again.";

      if (code === "EMAIL_ALREADY_USED") {
        setFieldErrors([
          { field: "email", message: message || "This email is already in use." },
        ]);
      } else if (code === "VALIDATION_ERROR" && Array.isArray(details)) {
        const matchingErrors = details.filter(({ field }) =>
          fields.some(({ name }) => name === field),
        );
        setFieldErrors(matchingErrors);
        if (matchingErrors.length === 0 || matchingErrors.length < details.length) {
          setFormError(message || fallbackMessage);
        }
      } else {
        setFormError(message || fallbackMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Create Account</h2>

        <form className="form" onSubmit={handleRegister}>
          {fields.map(({ name, label, ...attributes }) => {
            const inputId = `register-${name}`;
            const errorId = `${inputId}-error`;
            const messages = fieldErrors.filter(({ field }) => field === name);
            const hasErrors = messages.length > 0;

            return (
              <div key={name}>
                <label htmlFor={inputId}>
                  {label}
                  {!attributes.required && " (optional)"}
                </label>
                <input
                  {...attributes}
                  id={inputId}
                  name={name}
                  aria-invalid={hasErrors || undefined}
                  aria-describedby={hasErrors ? errorId : undefined}
                />
                {hasErrors && (
                  <p id={errorId} role="alert">
                    {messages.map(({ message }) => message).join(" ")}
                  </p>
                )}
              </div>
            );
          })}
          {formError && <p role="alert">{formError}</p>}
          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
