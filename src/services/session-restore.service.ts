/**
 * Session Restore Service — MedCore HIS
 *
 * Saves the user's last route + navigation state + form drafts on logout
 * so they can continue exactly where they left off on next login.
 *
 * Uses sessionStorage (cleared when the browser tab closes — clinically appropriate).
 * Form draft data is keyed per-route so multiple pages can have independent drafts.
 */

const MAX_SESSION_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Route / Navigation State ─────────────────────────────────────────────────

interface SavedSession {
  path: string;
  state: any;
  timestamp: number;
}

const sessionKey = (userId: number | string) => `hims_session_${userId}`;

export const sessionRestoreService = {
  /**
   * Save the current route path + router state before logout.
   */
  saveSession(userId: number | string, path: string, state?: any): void {
    try {
      const payload: SavedSession = { path, state: state ?? null, timestamp: Date.now() };
      sessionStorage.setItem(sessionKey(userId), JSON.stringify(payload));
    } catch (e) {
      console.warn('[SessionRestore] Failed to save session:', e);
    }
  },

  /**
   * Retrieve a previously saved session. Returns null if expired or missing.
   */
  restoreSession(userId: number | string): SavedSession | null {
    try {
      const raw = sessionStorage.getItem(sessionKey(userId));
      if (!raw) return null;
      const payload: SavedSession = JSON.parse(raw);
      if (Date.now() - payload.timestamp > MAX_SESSION_AGE_MS) {
        sessionStorage.removeItem(sessionKey(userId));
        return null;
      }
      return payload;
    } catch (e) {
      console.warn('[SessionRestore] Failed to restore session:', e);
      return null;
    }
  },

  /**
   * Clear the saved session after it has been consumed.
   */
  clearSession(userId: number | string): void {
    try {
      sessionStorage.removeItem(sessionKey(userId));
    } catch (e) {
      console.warn('[SessionRestore] Failed to clear session:', e);
    }
  },
};

// ─── Form Draft Service ───────────────────────────────────────────────────────

const draftKey = (userId: number | string, draftId: string) =>
  `hims_draft_${userId}_${draftId.replace(/[^a-zA-Z0-9]/g, '_')}`;

interface FormDraft<T = any> {
  data: T;
  timestamp: number;
}

export const formDraftService = {
  /**
   * Save form draft data.
   * @param userId  — the current user's ID
   * @param draftId — a unique identifier for this form context (e.g. "emr_chart_ENC-123")
   * @param data    — the form state to persist
   */
  saveDraft<T>(userId: number | string, draftId: string, data: T): void {
    try {
      const payload: FormDraft<T> = { data, timestamp: Date.now() };
      sessionStorage.setItem(draftKey(userId, draftId), JSON.stringify(payload));
    } catch (e) {
      console.warn('[FormDraft] Failed to save draft:', e);
    }
  },

  /**
   * Load a previously saved form draft. Returns null if expired or missing.
   */
  loadDraft<T>(userId: number | string, draftId: string): T | null {
    try {
      const raw = sessionStorage.getItem(draftKey(userId, draftId));
      if (!raw) return null;
      const payload: FormDraft<T> = JSON.parse(raw);
      if (Date.now() - payload.timestamp > MAX_SESSION_AGE_MS) {
        sessionStorage.removeItem(draftKey(userId, draftId));
        return null;
      }
      return payload.data;
    } catch (e) {
      console.warn('[FormDraft] Failed to load draft:', e);
      return null;
    }
  },

  /**
   * Clear a specific form draft after it has been consumed or submitted.
   */
  clearDraft(userId: number | string, draftId: string): void {
    try {
      sessionStorage.removeItem(draftKey(userId, draftId));
    } catch (e) {
      console.warn('[FormDraft] Failed to clear draft:', e);
    }
  },

  /**
   * Clear ALL drafts for a given user (called on full logout).
   */
  clearAllDrafts(userId: number | string): void {
    try {
      const prefix = `hims_draft_${userId}_`;
      const keys = Object.keys(sessionStorage).filter((k) => k.startsWith(prefix));
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {
      console.warn('[FormDraft] Failed to clear all drafts:', e);
    }
  },
};
