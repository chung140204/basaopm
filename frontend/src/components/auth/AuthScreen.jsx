// Màn Đăng nhập — Ethereal Glass × Editorial Split (soft-skill).
// Nửa trái: navy hero với mesh-glow xanh/mint, serif lớn, eyebrow tag.
// Nửa phải: glass form trong "double-bezel" card, floating-label fields,
// CTA button-in-button. Brand: color.md
// (Navy #000D6D · Blue #003AD6 · Mint #43F0A4). Dùng AuthContext (backend thật).
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

const EASE = 'cubic-bezier(0.32,0.72,0,1)';

// Input "double-bezel" + floating label: outer shell (xám hairline) bọc inner field.
function Field({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </span>
      <div className="rounded-[1.05rem] bg-slate-900/[0.03] p-[3px] ring-1 ring-slate-900/[0.06] transition-shadow duration-500 focus-within:ring-2 focus-within:ring-accent-500/40 focus-within:shadow-focus">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full rounded-[calc(1.05rem-3px)] bg-white px-4 py-3 text-[15px] text-ink-primary shadow-[inset_0_1px_2px_rgba(2,10,46,0.04)] outline-none placeholder:text-ink-muted/70"
        />
      </div>
    </label>
  );
}

export default function AuthScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      // Thành công → AuthContext set user → App tự chuyển màn.
      await login(email.trim(), password);
    } catch (e2) {
      setErr(e2.message || 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full overflow-hidden bg-[#F4F7FE] text-ink-primary">
      {/* Film-grain overlay (fixed, không bắt chuột) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ----- Nửa trái: Editorial navy hero ----- */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#020A2E] px-14 py-16 lg:flex">
        {/* mesh glow: blue + mint */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-1/4 h-[440px] w-[440px] rounded-full bg-[#003AD6] opacity-30 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 bottom-0 h-[360px] w-[360px] rounded-full bg-[#43F0A4] opacity-[0.18] blur-[140px]"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] bg-[#003AD6] text-lg font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
            B
          </div>
          <span className="text-sm font-medium tracking-wide text-[#DCE6FB]">
            BasaoPM
          </span>
        </div>

        <div className="relative">
          <span className="mb-6 inline-flex rounded-full border border-[#43F0A4]/40 bg-[#43F0A4]/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[#43F0A4]">
            Quản lý bất động sản
          </span>
          <h1
            className="text-[3.4rem] leading-[1.04] text-[#EEF3FE]"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Quản trị tài sản,
            <br />
            <em className="text-[#43F0A4]">trọn vẹn</em> &amp; tinh tế.
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-[#9DB0DA]">
            Nền tảng số hoá toàn bộ vòng đời lô đất — từ pháp lý, giao dịch đến
            bản đồ ranh thửa. Một không gian làm việc duy nhất.
          </p>

          {/* trust strip */}
          <div className="mt-10 flex items-center gap-6 text-[#9DB0DA]">
            {[
              { n: 'Pháp lý', d: 'Hồ sơ & sổ' },
              { n: 'Giao dịch', d: 'Theo dõi dòng tiền' },
              { n: 'Bản đồ', d: 'Ranh thửa số' },
            ].map((s) => (
              <div key={s.n} className="relative">
                <p className="text-[13px] font-semibold text-[#DCE6FB]">{s.n}</p>
                <p className="text-[11px] leading-tight">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-[#4A5680]">
          © 2026 BasaoPM · Khu TT Văn hóa Thể thao Du lịch Chí Linh
        </p>
      </aside>

      {/* ----- Nửa phải: glass form ----- */}
      <main className="relative z-20 flex w-full flex-1 items-center justify-center px-5 py-10 sm:px-10">
        {/* double-bezel glass card */}
        <div className="w-full max-w-[480px] rounded-[2rem] bg-white/50 p-2 shadow-[0_30px_80px_-30px_rgba(2,10,46,0.25)] ring-1 ring-slate-900/[0.05] backdrop-blur-xl">
          <div className="rounded-[calc(2rem-0.5rem)] bg-white/90 px-7 py-9 ring-1 ring-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:px-9">
            <h2
              className="text-[2rem] leading-tight text-ink-primary"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Chào mừng trở lại
            </h2>
            <p className="mt-2 mb-7 text-sm text-ink-secondary">
              Đăng nhập để tiếp tục quản lý dự án của bạn.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="email@basao.com"
                autoFocus
              />
              <Field
                label="Mật khẩu"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
              />

              {err && (
                <p className="rounded-[0.9rem] bg-danger-bg px-4 py-2.5 text-sm text-danger ring-1 ring-danger/10">
                  {err}
                </p>
              )}

              {/* CTA button-in-button */}
              <button
                type="submit"
                disabled={busy}
                className="group relative mt-2 flex w-full items-center justify-between rounded-full bg-[#020A2E] py-2 pl-6 pr-2 text-[15px] font-medium text-[#EEF3FE] shadow-[0_12px_28px_-12px_rgba(2,10,46,0.7)] transition-all duration-500 active:scale-[0.98] disabled:opacity-60"
                style={{ transitionTimingFunction: EASE }}
              >
                <span>{busy ? 'Đang xử lý…' : 'Đăng nhập'}</span>
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003AD6] text-white transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105"
                  style={{ transitionTimingFunction: EASE }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </form>

            <div className="mt-8 rounded-[1.1rem] bg-accent-50 p-4 ring-1 ring-accent-100">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent-600">
                Tài khoản demo
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-secondary">
                superadmin@basao.com · super1234
                <br />
                admin@basao.com · admin1234
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
