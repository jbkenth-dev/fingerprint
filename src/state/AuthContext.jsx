import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialUsers } from "../data/mockData";
import { apiFetch, setAuthToken, clearAuthToken } from "../api";

const AuthContext = createContext(null);

const STORAGE_KEY = "francis-key-auth";

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(initialUsers);
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Sync in-memory token cache on restore so the very first API call
        // (e.g. dashboard attendance fetch) can send the Authorization header.
        if (parsed?.token) setAuthToken(parsed.token);
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Listen for auth:expired event (emitted by apiFetch on 401)
  useEffect(() => {
    const handleExpired = () => {
      setSession(null);
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  // Load users from API (fallback to bundled initialUsers)
  useEffect(() => {
    if (!session?.token) return;
    let mounted = true;
    const loadUsers = () => apiFetch("/users.php")
      .then((data) => {
        if (mounted && Array.isArray(data)) setUsers(data);
      })
      .catch(() => {
        // keep bundled initialUsers on failure
      });
    loadUsers();
    window.addEventListener('api:recovered', loadUsers);
    return () => {
      mounted = false;
      window.removeEventListener('api:recovered', loadUsers);
    };
  }, [session?.token]);

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

  const login = async ({ identifier, password }) => {
    const { user, token } = await apiFetch("/auth.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const sessionData = { userId: user.id, role: user.role, token };

    // Persist to localStorage synchronously so concurrent apiFetch calls
    // (e.g. dashboard data fetches) can find the token before the useEffect runs.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch {}
    // Also set the in-memory cache so apiFetch never races with localStorage.
    setAuthToken(token);

    setSession(sessionData);
    // refresh user list from server
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, user];
    });
    return user;
  };

  const logout = () => {
    clearAuthToken();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setSession(null);
  };

  const updateOwnAccount = async (payload) => {
    if (!currentUser) return;
    const updated = await updateUser(currentUser.id, payload);
    return updated;
  };

  const addUser = async (payload) => {
    const user = await apiFetch("/users.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setUsers((prev) => [...prev, user]);
    return user;
  };

  const updateUser = async (id, payload) => {
    const user = await apiFetch("/users.php", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    return user;
  };

  const deleteUser = async (id) => {
    await apiFetch(`/users.php?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
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
