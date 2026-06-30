// Auth context: giữ token + user hiện tại, lưu localStorage (sống qua F5).
// Cung cấp login/logout + can(permission) để gating UI theo role.
// Bản đồ quyền lấy từ backend (/api/auth/meta) → FE không hardcode role.
import { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiMe, apiAuthMeta } from '../services/authApi';

const AuthContext = createContext(null);
const TOKEN_KEY = 'bpm.token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [roleMap, setRoleMap] = useState({}); // role value → { permissions }
  const [loading, setLoading] = useState(true);

  // Nạp bản đồ quyền (public) 1 lần.
  useEffect(() => {
    apiAuthMeta()
      .then((m) => {
        const map = {};
        for (const r of m.roles) map[r.value] = r;
        setRoleMap(map);
      })
      .catch(() => {});
  }, []);

  // Khôi phục phiên từ token đã lưu.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe(token)
      .then((d) => {
        if (!cancelled) setUser(d.user);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const applySession = ({ token: t, user: u }) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  };

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    applySession(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  // can(perm): user hiện tại có quyền không. superadmin ('*') = mọi quyền.
  const can = (perm) => {
    if (!user) return false;
    const perms = roleMap[user.role]?.permissions ?? [];
    return perms.includes('*') || perms.includes(perm);
  };

  const value = {
    token,
    user,
    loading,
    isAuthed: !!user,
    roles: roleMap,
    login,
    logout,
    can,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
