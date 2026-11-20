import { isAxiosError } from "axios";
import { useState } from "react";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setFormError("");

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("email", res.data.user.email);

      alert("Connexion OK !");
      window.location.href = "/profile";
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          setFormError("Email ou mot de passe incorrect.");
          return;
        }

        if (error.response?.status === 400) {
          const message = error.response.data?.message;
          setFormError(
            typeof message === "string" && message
              ? message
              : "Vérifie les données saisies.",
          );
          return;
        }

        if (error.request && !error.response) {
          setFormError("Impossible de joindre l’API. Réessaie dans un instant.");
          return;
        }
      }

      setFormError("La connexion a échoué. Réessaie dans un instant.");
    }
  }

  function toggleTheme() {
    document.body.classList.toggle("light");
  }

  return (
  <div className="container">
    <div className="card">
      <h2>Login</h2>

      <form onSubmit={handleLogin} className="form">
        <input
          placeholder="email"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="primary">
          Login
        </button>
        {formError && <p role="alert">{formError}</p>}
      </form>

      <button className="theme-btn" onClick={toggleTheme}>
        Light / Dark
      </button>
    </div>
    </div>
  );
}
