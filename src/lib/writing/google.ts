"use client";

/*
 * Google Drive access for private docs, entirely in the browser.
 * - Auth: Google Identity Services token client, scope `drive.file`
 *   (only files this app created or the user picked; non-sensitive scope).
 * - Picker: lets the user grant access to an existing Doc.
 * Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_API_KEY and
 * NEXT_PUBLIC_GOOGLE_APP_ID (the Cloud project number).
 */

/** Env values pasted/piped on Windows can carry a BOM or CR; Google rejects them silently. */
const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();
const CLIENT_ID = clean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const API_KEY = clean(process.env.NEXT_PUBLIC_GOOGLE_API_KEY);
const APP_ID = clean(process.env.NEXT_PUBLIC_GOOGLE_APP_ID);
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const TOKEN_KEY = "gdocs_token_v1";

export const googleConfigured = Boolean(CLIENT_ID && API_KEY);

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  callback: (r: TokenResponse) => void;
  requestAccessToken: (o?: { prompt?: string }) => void;
}
interface GoogleGlobal {
  accounts: { oauth2: { initTokenClient: (cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void }) => TokenClient } };
  picker: {
    PickerBuilder: new () => PickerBuilder;
    DocsView: new (viewId?: string) => { setMimeTypes: (m: string) => unknown; setFileIds: (ids: string) => unknown };
    ViewId: { DOCUMENTS: string };
    Action: { PICKED: string; CANCEL: string };
  };
}
interface PickerBuilder {
  addView: (v: unknown) => PickerBuilder;
  setOAuthToken: (t: string) => PickerBuilder;
  setDeveloperKey: (k: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setTitle: (t: string) => PickerBuilder;
  setLocale: (l: string) => PickerBuilder;
  setCallback: (cb: (d: { action: string; docs?: { id: string; name: string; url: string }[] }) => void) => PickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
}
declare global {
  interface Window {
    google?: GoogleGlobal;
    gapi?: { load: (lib: string, cb: () => void) => void };
  }
}

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src);
          reject(new Error(`Không tải được ${src}`));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return scripts.get(src)!;
}

let tokenClient: TokenClient | null = null;
let cached: { token: string; expiry: number } | null = null;

function readStoredToken() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    const t = raw ? (JSON.parse(raw) as { token: string; expiry: number }) : null;
    return t && t.expiry > Date.now() + 60_000 ? t : null;
  } catch {
    return null;
  }
}

export function forgetGoogleToken() {
  cached = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** A still-valid token from this session, without any popup (for background sync). */
export function getCachedToken(): string | null {
  cached ??= readStoredToken();
  return cached && cached.expiry > Date.now() + 60_000 ? cached.token : null;
}

/** Get a Drive access token; shows Google's consent popup when needed. Call from a click handler. */
export async function getAccessToken(forceConsent = false): Promise<string> {
  if (!googleConfigured) throw new Error("Chưa cấu hình Google Client ID / API key.");
  if (!forceConsent) {
    cached ??= readStoredToken();
    if (cached && cached.expiry > Date.now() + 60_000) return cached.token;
  }
  await loadScript("https://accounts.google.com/gsi/client");
  const google = window.google!;
  tokenClient ??= google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: () => {} });
  const client = tokenClient;
  const response = await new Promise<TokenResponse>((resolve) => {
    client.callback = resolve;
    client.requestAccessToken({ prompt: forceConsent ? "consent" : "" });
  });
  if (!response.access_token) throw new Error(response.error === "access_denied" ? "Bạn đã từ chối quyền truy cập Google Drive." : "Đăng nhập Google thất bại.");
  cached = { token: response.access_token, expiry: Date.now() + (response.expires_in ?? 3600) * 1000 };
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(cached));
  } catch {
    /* ignore */
  }
  return cached.token;
}

export class NeedsAuthError extends Error {
  constructor() {
    super("Phiên Google đã hết hạn. Bấm “Kết nối lại” để tiếp tục đồng bộ.");
  }
}

let backgroundMode = false;
/** Run Drive calls without ever opening a popup (throws NeedsAuthError instead). */
export async function withoutPopup<T>(fn: () => Promise<T>): Promise<T> {
  backgroundMode = true;
  try {
    return await fn();
  } finally {
    backgroundMode = false;
  }
}

async function drive(url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  let token: string;
  if (backgroundMode) {
    const t = getCachedToken();
    if (!t) throw new NeedsAuthError();
    token = t;
  } else {
    token = await getAccessToken();
  }
  const res = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (res.status === 401 && retry) {
    forgetGoogleToken();
    if (backgroundMode) throw new NeedsAuthError();
    return drive(url, init, false);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = body.error?.message ?? `HTTP ${res.status}`;
    const friendly =
      res.status === 404
        ? "Không tìm thấy Doc (có thể đã bị xoá hoặc app chưa được cấp quyền)."
        : res.status === 403 && /permission|insufficient|writer|forbidden/i.test(msg)
          ? `Tài khoản Google này không có quyền sửa Doc (chỉ được xem). Chủ Doc cần chia sẻ quyền “Người chỉnh sửa”. (${msg})`
          : msg;
    throw Object.assign(new Error(friendly), {
      status: res.status,
    });
  }
  return res;
}

export interface DocMeta {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
}
const META_FIELDS = "id,name,modifiedTime,webViewLink";

/** Create a new Google Doc from HTML (Drive converts HTML → Docs). */
export async function createDocFromHtml(name: string, html: string): Promise<DocMeta> {
  const boundary = `b${crypto.randomUUID()}`;
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name, mimeType: "application/vnd.google-apps.document" }) +
    `\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
  const res = await drive(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${META_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return res.json();
}

/** Overwrite an existing Google Doc's content with HTML. */
export async function updateDocFromHtml(id: string, html: string): Promise<DocMeta> {
  const res = await drive(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media&fields=${META_FIELDS}`, {
    method: "PATCH",
    headers: { "Content-Type": "text/html; charset=UTF-8" },
    body: html,
  });
  return res.json();
}

/** The Google account the current token belongs to (works with the drive.file scope). */
export async function getDriveUser(): Promise<{ emailAddress: string; displayName: string }> {
  const res = await drive("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)");
  return ((await res.json()) as { user: { emailAddress: string; displayName: string } }).user;
}

export async function getDocMeta(id: string): Promise<DocMeta> {
  return (await drive(`https://www.googleapis.com/drive/v3/files/${id}?fields=${META_FIELDS}`)).json();
}

export async function exportDocHtml(id: string): Promise<string> {
  return (await drive(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/html`)).text();
}

/**
 * Open Google Picker to choose an existing Doc; grants this app access to it.
 * With `onlyFileId`, the Picker shows just that Doc (used to grant write access
 * to a Doc that was imported through its public link).
 */
export async function pickGoogleDoc(onlyFileId?: string): Promise<{ id: string; name: string; url: string } | null> {
  const token = await getAccessToken();
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((resolve) => window.gapi!.load("picker", resolve));
  const g = window.google!;
  return new Promise((resolve) => {
    const view = new g.picker.DocsView(g.picker.ViewId.DOCUMENTS);
    view.setMimeTypes("application/vnd.google-apps.document");
    if (onlyFileId) view.setFileIds(onlyFileId);
    let builder = new g.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setTitle("Chọn Google Doc")
      .setLocale("vi")
      .setCallback((d) => {
        if (d.action === g.picker.Action.PICKED && d.docs?.[0]) resolve(d.docs[0]);
        else if (d.action === g.picker.Action.CANCEL) resolve(null);
      });
    if (APP_ID) builder = builder.setAppId(APP_ID);
    builder.build().setVisible(true);
  });
}
