import { useState } from 'react';
import LoginScreen from './components/auth/LoginScreen';
import WelcomeScreen from './components/welcome/WelcomeScreen';
import ProjectWorkspace from './components/ProjectWorkspace';
import Toast from './components/Toast';
import { PROJECTS } from './data/projects';
import usePersistentState from './utils/usePersistentState';

const USER_NAME = 'Nguyễn A';

export default function App() {
  // Navigation stages: 'login' -> 'welcome' -> 'workspace'.
  // Persisted so a page refresh (F5) restores the current screen.
  const [stage, setStage] = usePersistentState('bpm.stage', 'login');
  const [projects, setProjects] = usePersistentState('bpm.projects', PROJECTS);
  const [openProjectId, setOpenProjectId] = usePersistentState(
    'bpm.openProjectId',
    null
  );
  const [toast, setToast] = useState(null);

  const showToast = (message) => setToast({ message, id: Math.random() });

  const openProject = projects.find((p) => p.id === openProjectId) ?? null;

  // ---- Project actions (shared by workspace info screen) ---------------
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

  // ---- Render by stage --------------------------------------------------
  if (stage === 'login') {
    return <LoginScreen onLogin={() => setStage('welcome')} />;
  }

  if (stage === 'welcome' || !openProject) {
    return (
      <>
        <WelcomeScreen
          projects={projects}
          userName={USER_NAME}
          onOpenProject={(p) => {
            setOpenProjectId(p.id);
            setStage('workspace');
          }}
          onSaveProject={handleSaveProject}
          onHideProject={handleHideProject}
          onRestoreProject={handleRestoreProject}
        />
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  return (
    <>
      <ProjectWorkspace
        project={openProject}
        onBack={() => {
          setStage('welcome');
          setOpenProjectId(null);
        }}
        showToast={showToast}
        onSaveProject={handleSaveProject}
        onHideProject={handleHideProject}
        onRestoreProject={handleRestoreProject}
      />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
