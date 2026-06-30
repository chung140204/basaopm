// Drawer trượt từ trái cho điều hướng trên mobile (<md). Desktop không dùng
// (luôn md:hidden) — desktop render Sidebar tĩnh riêng ở ProjectWorkspace.
//  - Overlay mờ click để đóng.
//  - ESC để đóng.
//  - Khoá scroll body khi mở.
import { useEffect } from 'react';

export default function SidebarDrawer({ open, onClose, children }) {
  // ESC đóng (chỉ khi đang mở).
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Khoá scroll body khi drawer mở.
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Overlay — chỉ mobile, fade theo open. */}
      <div
        onMouseDown={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-[rgba(15,23,42,0.5)] transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Drawer trượt từ trái. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  );
}
