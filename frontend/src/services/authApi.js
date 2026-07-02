// API xác thực BasaoPM. Dùng cùng base URL với cellsApi (backend FastAPI).
const API =
  import.meta.env.VITE_API_URL_RANH_THUA || 'http://localhost:8000';

// Khoá token trong localStorage (khớp TOKEN_KEY ở AuthContext).
const TOKEN_KEY = 'bpm.token';

/**
 * Header Authorization từ token đã đăng nhập (rỗng nếu chưa đăng nhập).
 * Dùng cho các request GHI cần xác thực (PUT/POST) ở các service khác.
 */
export function authHeader() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function jsonOrThrow(res) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const msg = data?.detail || `Lỗi máy chủ (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return jsonOrThrow(res); // { token, user }
}

export async function apiMe(token) {
  const res = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return jsonOrThrow(res); // { user }
}

export async function apiAuthMeta() {
  const res = await fetch(`${API}/api/auth/meta`);
  return jsonOrThrow(res); // { roles, permissions }
}

// Dự án user được phép xem (gating tầng dự án).
export async function apiMyProjects(token) {
  const res = await fetch(`${API}/api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return jsonOrThrow(res); // { projects, projectIds, isSuperadmin }
}

export async function apiListUsers(token) {
  const res = await fetch(`${API}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return jsonOrThrow(res); // { users }
}

export async function apiUpdateUserRole(token, userId, role) {
  const res = await fetch(`${API}/api/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  return jsonOrThrow(res);
}
