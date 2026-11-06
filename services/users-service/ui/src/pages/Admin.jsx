import { useEffect, useState } from "react";
import api from "../api";

export default function Admin() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await api.get("/users/admin", {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });

        setMsg(res.data.msg || "Welcome ADMIN!");
      } catch {
        setMsg("Forbidden (role != admin)");
      }
    }

    checkAdmin();
  }, []);

  return (
    <div className="container">
    <div className="card">
      <h2>Admin page</h2>
      <p>{msg}</p>
    </div>
    </div>
  );
}
