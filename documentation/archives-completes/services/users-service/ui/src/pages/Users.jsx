import { useEffect, useState } from "react";
import api from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("participant");

  const roleLocal = localStorage.getItem("role");

  
  async function loadUsers() {
    try {
      const res = await api.get("/users/all");
      setUsers(res.data);
    } catch {
      alert("Not allowed");
      window.location.href = "/login";
    }
  }

  async function deleteUser(id) {
    if (!window.confirm("Delete this user?")) return;

    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch {
      alert("Delete failed");
    }
  }

  async function createUser(e) {
    e.preventDefault();

    try {
      await api.post("/users/register", {
        email,
        password,
        role,
      });

      alert("User created !");
      setShowForm(false);
      loadUsers();

    } catch {
      alert("Create failed");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h2>Users</h2>

        {roleLocal === "admin" && (
          <button className="primary" onClick={() => setShowForm(!showForm)}>
            ➕ Add User
          </button>
        )}

        {showForm && (
          <form onSubmit={createUser} className="form">
            <input placeholder="email" onChange={e => setEmail(e.target.value)} />
            <input
              placeholder="password"
              type="password"
              onChange={e => setPassword(e.target.value)}
            />

            <select onChange={e => setRole(e.target.value)}>
              <option value="participant">participant</option>
              <option value="admin">admin</option>
            </select>

            <button type="submit">Create</button>
          </form>
        )}

        <hr />

        {users.map((u) => (
          <div key={u.id} className="user-row">
            <span>
              <b>{u.email}</b> ({u.role})
            </span>

            {roleLocal === "admin" && (
              <button className="danger" onClick={() => deleteUser(u.id)}>Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
