import { useState } from "react";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

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
    } catch {
      alert("Login FAILED");
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
      </form>

      <button className="theme-btn" onClick={toggleTheme}>
        Light / Dark
      </button>
    </div>
    </div>
  );
}
