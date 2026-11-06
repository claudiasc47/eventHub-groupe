import { useState } from "react";
import api from "../api";

export default function Reset() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleReset(e) {
    e.preventDefault();

    try {
      const res = await api.post(
        "/users/reset-password",
        { oldPassword, newPassword },
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        }
      );

      setMsg(res.data.message || "Password updated");
    } catch {
      setMsg("Erreur lors du reset");
    }
  }

  return (
    <div className="container">
    <div className="card">
      <h2>Reset password</h2>

      <form onSubmit={handleReset} className="form">
        <input
          type="password"
          placeholder="Ancien mot de passe"
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button type="submit" className="primary">
          Mettre à jour
        </button>
      </form>

      {msg && <p className="info">{msg}</p>}
    </div>
    </div>
  );
}
