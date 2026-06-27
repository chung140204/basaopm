import { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';

// Demo login — no real authentication. Any submit logs the user in.
export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('nguyena@basao.com');
  const [password, setPassword] = useState('demo1234');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-600 text-xl font-bold text-white">
            B
          </div>
          <h1 className="text-xl font-semibold text-ink-primary">BasaoPM</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Hệ thống quản lý tài sản bất động sản
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface-1 p-6 shadow-sm"
        >
          <h2 className="mb-1 text-lg font-semibold text-ink-primary">
            Đăng nhập
          </h2>
          <p className="mb-5 text-sm text-ink-muted">
            Nhập thông tin để truy cập hệ thống
          </p>

          {/* Email */}
          <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
            Email
          </label>
          <div className="relative mb-4">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
              placeholder="email@basao.com"
            />
          </div>

          {/* Password */}
          <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
            Mật khẩu
          </label>
          <div className="relative mb-5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm text-ink-primary focus:border-accent-500 focus:outline-none focus:shadow-focus"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </button>

          <p className="mt-4 text-center text-xs text-ink-muted">
            Bản demo — bấm Đăng nhập để vào hệ thống.
          </p>
        </form>
      </div>
    </div>
  );
}
