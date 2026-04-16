import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialUsers } from "../data/mockData";

const AuthContext = createContext(null);

const STORAGE_KEY = "francis-key-auth";

const API_BASE = "/api"; // Assumes PHP files are served from /api

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(initialUsers);
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Load users from API (fallback to bundled initialUsers)
  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/users.php`)
      .then((r) => r.json())
      .then((data) => {
        if (mounted && Array.isArray(data)) setUsers(data);
      })
      .catch(() => {
        // keep bundled initialUsers on failure
      });
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {}
    } else {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  }, [session]);

  const currentUser = useMemo(
    () => users.find((user) => user.id === session?.userId) ?? null,
    [session, users],
  );

  const login = async ({ identifier, password, role }) => {
    const res = await fetch(`${API_BASE}/auth.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, role }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }

    const { user } = await res.json();
    setSession({ userId: user.id, role: user.role });
    // refresh user list from server
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, user];
    });
    return user;
  };

  const logout = () => setSession(null);

  const updateOwnAccount = async (payload) => {
    if (!currentUser) return;
    const updated = await updateUser(currentUser.id, payload);
    return updated;
  };

  const addUser = async (payload) => {
    const res = await fetch(`${API_BASE}/users.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to add user");
    const user = await res.json();
    setUsers((prev) => [...prev, user]);
    return user;
  };

  const updateUser = async (id, payload) => {
    const res = await fetch(`${API_BASE}/users.php`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) throw new Error("Failed to update user");
    const user = await res.json();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    return user;
  };

  const deleteUser = async (id) => {
    const res = await fetch(`${API_BASE}/users.php?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete user");
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return true;
  };

  const value = {
    users,
    session,
    currentUser,
    login,
    logout,
    updateOwnAccount,
    addUser,
    updateUser,
    deleteUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
