import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DashboardScreen from './dashboard/DashboardScreen';
import MapScreen from './map/MapScreen';
import LotListScreen from './lot/LotListScreen';
import CellListScreen from './cell/CellListScreen';
import usePersistentState from '../utils/usePersistentState';

const TITLES = {
  dashboard: 'Dashboard',
  map: 'Bản đồ',
  lot: 'Quản lý theo lô',
  cell: 'Quản lý theo ô',
};

export default function ProjectWorkspace({
  project,
  onBack,
  showToast,
}) {
  // Persisted per project so a refresh (F5) returns to the same section
  // (e.g. Bản đồ) instead of resetting to the dashboard.
  const [section, setSection] = usePersistentState(
    `bpm.section.${project.id}`,
    'dashboard'
  );

  const breadcrumb = `${project.tenHienThi} › ${TITLES[section] ?? ''}`;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        project={project}
        activeKey={section}
        onNavigate={setSection}
        onBack={onBack}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={breadcrumb} />

        {section === 'dashboard' && <DashboardScreen project={project} />}
        {section === 'map' && <MapScreen showToast={showToast} />}
        {section === 'lot' && <LotListScreen showToast={showToast} />}
        {section === 'cell' && <CellListScreen />}
      </div>
    </div>
  );
}
