"use client";

import { useState } from "react";
import { CloudOff, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cloudConfigured } from "@/lib/cloud/client";
import { useAuth } from "@/store/auth-store";
import { useCloud, type CloudStatus } from "@/store/cloud-store";

function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const notice = useAuth((s) => s.notice);
  const setNotice = useAuth((s) => s.setNotice);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const err = await (mode === "in" ? signIn(email, password) : signUp(email, password));
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    if (mode === "in") {
      toast.success("Đã đăng nhập");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để wiki và truyện được lưu lên mạng, mở ở máy khác vẫn thấy đủ.
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Mật khẩu</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </label>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError(null);
              }}
            >
              {mode === "in" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function syncText(status: CloudStatus, lastSyncAt: number | null, error: string | null) {
  if (status === "syncing") return "Đang đồng bộ…";
  if (status === "error") return `Lỗi đồng bộ: ${error ?? ""}`.trim();
  if (lastSyncAt) return `Đã đồng bộ lúc ${new Date(lastSyncAt).toLocaleTimeString("vi")}`;
  return "Chưa đồng bộ lần nào";
}

/** Nút tài khoản trên thanh trên cùng; ẩn hẳn khi chưa cấu hình Supabase. */
export function AccountMenu() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const cloudStatus = useCloud((s) => s.status);
  const lastSyncAt = useCloud((s) => s.lastSyncAt);
  const cloudError = useCloud((s) => s.error);
  const outdated = useCloud((s) => s.schemaOutdated);
  const [open, setOpen] = useState(false);

  if (!cloudConfigured) return null;

  if (status !== "signed-in")
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={status === "loading"}>
          <CloudOff /> <span className="hidden sm:inline">Đăng nhập</span>
        </Button>
        <AuthDialog open={open} onOpenChange={setOpen} />
      </>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Tài khoản" title={user?.email ?? "Tài khoản"} />}>
        <UserRound />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{user?.email}</p>
        <p className="px-2 pb-1.5 text-xs text-muted-foreground">{syncText(cloudStatus, lastSyncAt, cloudError)}</p>
        {outdated && (
          <p className="px-2 pb-1.5 text-xs text-amber-600 dark:text-amber-400">
            Máy chủ còn thiếu cột mới: phần truyện và tóm tắt chỉ lưu trên máy này. Chạy file
            supabase/migrations/0002 trong Supabase để đồng bộ nốt.
          </p>
        )}
        <DropdownMenuItem
          onClick={() => {
            void signOut();
            toast.success("Đã đăng xuất. Dữ liệu vẫn còn trên máy này.");
          }}
        >
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
