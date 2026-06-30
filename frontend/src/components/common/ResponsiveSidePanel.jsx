// Vỏ panel chi tiết responsive — dùng chung cho mọi panel cạnh bản đồ/danh sách.
//  - Mobile (<md): bottom-sheet trượt lên từ đáy (~85vh), có overlay mờ click đóng.
//  - Desktop (md+): cột phải tĩnh như cũ (border trái), rộng theo widthClass.
// Nội dung (header + body) truyền qua children — panel con không cần đổi logic.
// ESC để đóng gom ở đây (panel con KHÔNG cần tự bắt ESC nữa).
import { useEffect } from 'react';

export default function ResponsiveSidePanel({
  onClose,
  widthClass = 'md:w-[360px]',
  children,
}) {
  // ESC đóng.
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <>
      {/* Overlay — chỉ mobile (desktop là cột tĩnh, không cần overlay). */}
      <div
        onMouseDown={onClose}
        aria-hidden
        className="fixed inset-0 z-40 bg-[rgba(15,23,42,0.5)] md:hidden"
      />
      {/* Mobile: bottom-sheet. Desktop: cột phải tĩnh. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-surface-1 shadow-xl md:static md:inset-auto md:bottom-auto md:z-auto md:h-full md:max-h-none md:flex-shrink-0 md:rounded-none md:border-l md:border-line md:shadow-none ${widthClass}`}
      >
        {children}
      </div>
    </>
  );
}
