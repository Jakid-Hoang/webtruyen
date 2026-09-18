/** Extract a Google Docs file id from a URL or a bare id. */
export function parseGoogleDocId(input: string): string | null {
  const s = input.trim();
  const fromUrl = /\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{20,})/.exec(s);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9_-]{20,100}$/.test(s) ? s : null;
}
