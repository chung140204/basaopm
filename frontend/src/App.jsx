import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AuthScreen from './components/auth/AuthScreen';
import WelcomeScreen from './components/welcome/WelcomeScreen';
import ProjectWorkspace from './components/ProjectWorkspace';
import Toast from './components/Toast';
import { PROJECTS } from './data/projects';
import usePersistentState from './utils/usePersistentState';
import { useAuth } from './auth/AuthContext';
import { useProjectAccess } from './hooks/useProjectAccess';

// Spinner dùng chung cho trạng thái đang khôi phục phiên.
function Spinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FE]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#020A2E]/20 border-t-[#003AD6]" />
    </div>
  );
}

// Chặn route khi chưa đăng nhập → chuyển về /login.
// accessReady: chờ quyền dự án (DB) load xong mới render — tránh chặn nhầm
// dự án khi danh sách được phép chưa kịp về.
function ProtectedRoute({ children, accessReady = true }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (!accessReady) return <Spinner />;
  return children;
}

// Màn đăng nhập; nếu đã đăng nhập rồi thì về /projects.
function LoginRoute() {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Spinner />;
  if (isAuthed) return <Navigate to="/projects" replace />;
  return <AuthScreen />;
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Kho dự án (mock + chỉnh sửa/ẩn local). Sống qua F5 → localStorage.
  const [projects, setProjects] = usePersistentState('bpm.projects', PROJECTS);
  const [toast, setToast] = useState(null);

  // Quyền xem dự án (từ DB): admin chỉ thấy dự án được gán; superadmin thấy hết.
  const { allowedIds, isSuperadmin, ready: accessReady } = useProjectAccess();
  const visibleProjects = isSuperadmin
    ? projects
    : projects.filter((p) => allowedIds.has(p.id));

  const USER_NAME = user?.fullName || user?.email || 'Người dùng';
  const showToast = (message) => setToast({ message, id: Math.random() });

  // ---- Project actions (shared by welcome + workspace info screen) ------
  const handleSaveProject = (updated) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    showToast('Đã cập nhật thông tin dự án');
  };
  const handleHideProject = (p) => {
    setProjects((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, status: 'hidden' } : x))
    );
    showToast(`Đã ẩn dự án «${p.tenHienThi}»`);
  };
  const handleRestoreProject = (p) => {
    setProjects((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, status: 'visible' } : x))
    );
    showToast('Đã khôi phục dự án');
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route
          path="/projects"
          element={
            <ProtectedRoute accessReady={accessReady}>
              <WelcomeScreen
                projects={visibleProjects}
                userName={USER_NAME}
                // Mở dự án = điều hướng bằng URL.
                onOpenProject={(p) => navigate(`/projects/${p.id}`)}
                onSaveProject={handleSaveProject}
                onHideProject={handleHideProject}
                onRestoreProject={handleRestoreProject}
              />
            </ProtectedRoute>
          }
        />

        {/* Workspace: section optional (mặc định dashboard). 1 route cho cả 2. */}
        <Route
          path="/projects/:projectId/:section?"
          element={
            <ProtectedRoute accessReady={accessReady}>
              <ProjectWorkspace projects={visibleProjects} showToast={showToast} />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
