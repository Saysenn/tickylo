export interface SessionData {
  entry_id: string;
  start_time: string;
  title: string | null;
}

export const Storage = {
  getSession: (): Promise<SessionData | null> =>
    chrome.storage.local.get("session").then((r) => r.session ?? null),
  setSession: (s: SessionData) =>
    chrome.storage.local.set({ session: s }),
  clearSession: () =>
    chrome.storage.local.remove("session"),
};
