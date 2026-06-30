import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import SidebarDrawer from './common/SidebarDrawer';
import Topbar from './Topbar';
import DashboardScreen from './dashboard/DashboardScreen';
import MapScreen from './map/MapScreen';
import LotListScreen from './lot/LotListScreen';
import CellListScreen from './cell/CellListScreen';

const TITLES = {
  dashboard: 'Dashboard',
  map: 'Bản đồ',
  lot: 'Quản lý theo lô',
  cell: 'Quản lý theo ô',
};
const SECTIONS = Object.keys(TITLES);

export default function ProjectWorkspace({ projects, showToast }) {
  const { projectId, section: sectionParam } = useParams();
  const navigate = useNavigate();

  // Section lấy từ URL; thiếu/không hợp lệ → mặc định 'dashboard'.
  const section = SECTIONS.includes(sectionParam) ? sectionParam : 'dashboard';

  // Điều hướng "deep link" từ panel lô → mở chi tiết 1 ô ở màn Quản lý theo ô.
  // State tạm one-shot: CellListScreen đọc rồi tự mở + tự xoá.
  const [pendingCellCode, setPendingCellCode] = useState(null);

  // Drawer điều hướng trên mobile (desktop dùng sidebar tĩnh).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Đổi section → đóng drawer (phòng hờ, ngoài việc đóng ngay khi điều hướng).
  useEffect(() => setDrawerOpen(false), [sectionParam]);

  const project = projects.find((p) => p.id === projectId) ?? null;
  // Dự án không tồn tại → về danh sách.
  if (!project) return <Navigate to="/projects" replace />;

  const goToCell = (cellCode) => {
    setPendingCellCode(cellCode);
    navigate(`/projects/${projectId}/cell`);
  };

  const breadcrumb = `${project.tenHienThi} › ${TITLES[section] ?? ''}`;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar tĩnh — chỉ desktop (md+). */}
      <div className="hidden md:flex">
        <Sidebar
          project={project}
          activeKey={section}
          onNavigate={(key) => navigate(`/projects/${projectId}/${key}`)}
          onBack={() => navigate('/projects')}
        />
      </div>

      {/* Drawer điều hướng — chỉ mobile. Điều hướng xong thì đóng drawer. */}
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Sidebar
          project={project}
          activeKey={section}
          onNavigate={(key) => {
            navigate(`/projects/${projectId}/${key}`);
            setDrawerOpen(false);
          }}
          onBack={() => {
            navigate('/projects');
            setDrawerOpen(false);
          }}
        />
      </SidebarDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={breadcrumb} onMenuClick={() => setDrawerOpen(true)} />

        {section === 'dashboard' && <DashboardScreen project={project} />}
        {section === 'map' && <MapScreen showToast={showToast} />}
        {section === 'lot' && (
          <LotListScreen showToast={showToast} onOpenCell={goToCell} />
        )}
        {section === 'cell' && (
          <CellListScreen
            initialCellCode={pendingCellCode}
            onConsumeInitial={() => setPendingCellCode(null)}
          />
        )}
      </div>
    </div>
  );
}
