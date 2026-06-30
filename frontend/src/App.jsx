import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AuthScreen from './components/auth/AuthScreen';
import WelcomeScreen from './components/welcome/WelcomeScreen';
import ProjectWorkspace from './components/ProjectWorkspace';
import Toast from './components/Toast';
import { PROJECTS } from './data/projects';
import usePersistentState from './utils/usePersistentState';
import { useAuth } from './auth/AuthContext';

// Spinner dùng chung cho trạng thái đang khôi phục phiên.
function Spinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FE]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#020A2E]/20 border-t-[#003AD6]" />
    </div>
  );
}

// Chặn route khi chưa đăng nhập → chuyển về /login.
function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAuthed) return <Navigate to="/login" replace />;
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
  // Dữ liệu dự án phải sống qua F5 → vẫn lưu localStorage.
  const [projects, setProjects] = usePersistentState('bpm.projects', PROJECTS);
  const [toast, setToast] = useState(null);

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
            <ProtectedRoute>
              <WelcomeScreen
                projects={projects}
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

        <Route
          path="/projects/:projectId/:section"
          element={
            <ProtectedRoute>
              <ProjectWorkspace
                projects={projects}
                showToast={showToast}
                onSaveProject={handleSaveProject}
                onHideProject={handleHideProject}
                onRestoreProject={handleRestoreProject}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectWorkspace
                projects={projects}
                showToast={showToast}
                onSaveProject={handleSaveProject}
                onHideProject={handleHideProject}
                onRestoreProject={handleRestoreProject}
              />
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
