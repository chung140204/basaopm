// Hook lấy QUYỀN xem dự án của user hiện tại (gating tầng dự án).
//   - Gọi GET /api/projects → { projectIds, isSuperadmin }.
//   - Trả { allowedIds: Set, isSuperadmin, ready }.
//   - App.jsx dùng để lọc danh sách dự án (mock) theo quyền thật từ DB.
// Fail-safe: backend lỗi/tắt → superadmin vẫn thấy hết (ready), admin thấy rỗng.
import { useEffect, useState } from 'react';
import { apiMyProjects } from '../services/authApi';
import { useAuth } from '../auth/AuthContext';

export function useProjectAccess() {
  const { token, user } = useAuth();
  const [allowedIds, setAllowedIds] = useState(() => new Set());
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setAllowedIds(new Set());
      setIsSuperadmin(false);
      setReady(true);
      return undefined;
    }
    setReady(false);
    apiMyProjects(token)
      .then((data) => {
        if (cancelled) return;
        setAllowedIds(new Set(data.projectIds || []));
        setIsSuperadmin(Boolean(data.isSuperadmin));
      })
      .catch(() => {
        if (cancelled) return;
        // Fail-safe: lỗi API → suy theo role local (superadmin thấy hết).
        const sa = user?.role === 'superadmin';
        setIsSuperadmin(sa);
        setAllowedIds(new Set());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

  return { allowedIds, isSuperadmin, ready };
}
