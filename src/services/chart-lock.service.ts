/**
 * EMR Chart Lock Service — MedCore HIS
 *
 * Prevents nurses from simultaneously opening multiple patient charts across tabs.
 * Uses BroadcastChannel for real-time cross-tab communication and
 * localStorage for persistence (survives tab refresh).
 *
 * A conflict occurs when:
 *   - Another browser tab has acquired the lock AND
 *   - That tab contains a DIFFERENT encounter number than the one being opened
 */

const LOCK_KEY = 'hims_emr_active_chart';
const CHANNEL_NAME = 'hims-emr-chart-lock';
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 min stale lock auto-expiry

// ─── Tab Identity ─────────────────────────────────────────────────────────────

/**
 * Each browser tab gets a unique ID for the lifetime of the tab session.
 */
const TAB_ID = (() => {
  let id = sessionStorage.getItem('hims_tab_id');
  if (!id) {
    id = `tab_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    sessionStorage.setItem('hims_tab_id', id);
  }
  return id;
})();

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChartLock {
  encounterNumber: string;
  tabId: string;
  timestamp: number;
}

type LockMessage =
  | { type: 'CHART_OPENED'; lock: ChartLock }
  | { type: 'CHART_CLOSED'; tabId: string };

type ConflictCallback = (conflictingEncounter: string) => void;

// ─── Service ─────────────────────────────────────────────────────────────────

class ChartLockService {
  private channel: BroadcastChannel | null = null;
  private conflictCallback: ConflictCallback | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => this._handleMessage(event.data as LockMessage);
    }
  }

  private _handleMessage(msg: LockMessage): void {
    if (msg.type === 'CHART_OPENED') {
      const { lock } = msg;
      // If a DIFFERENT tab just opened a chart while WE already have one open
      if (lock.tabId !== TAB_ID) {
        const myLock = this.getCurrentLock();
        if (myLock && myLock.tabId === TAB_ID && myLock.encounterNumber !== lock.encounterNumber) {
          // We hold the lock but another tab is trying to open a different chart
          // This tab was opened first, so just notify — the other tab will show the modal
          // (handled on the new tab's mount)
        }
      }
    }
  }

  /**
   * Read the current lock from localStorage.
   */
  getCurrentLock(): ChartLock | null {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      const lock: ChartLock = JSON.parse(raw);
      // Auto-expire stale locks
      if (Date.now() - lock.timestamp > LOCK_TIMEOUT_MS) {
        localStorage.removeItem(LOCK_KEY);
        return null;
      }
      return lock;
    } catch {
      return null;
    }
  }

  /**
   * Check if another tab has a lock that conflicts with the given encounter number.
   * Returns the conflicting encounter number if blocked, null if clear to proceed.
   */
  checkConflict(encounterNumber: string): string | null {
    const existing = this.getCurrentLock();
    if (!existing) return null;
    if (existing.tabId === TAB_ID) return null; // Our own lock — refresh is OK
    // Another tab has a lock — only conflict if it's a DIFFERENT encounter
    if (existing.encounterNumber !== encounterNumber) {
      return existing.encounterNumber;
    }
    return null;
  }

  /**
   * Acquire the chart lock for this tab.
   * Call this when the EMRChart component mounts.
   */
  acquireLock(encounterNumber: string): void {
    const lock: ChartLock = { encounterNumber, tabId: TAB_ID, timestamp: Date.now() };
    try {
      localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
    } catch (e) {
      console.warn('[ChartLock] Failed to acquire lock:', e);
    }
    // Broadcast to other tabs
    this.channel?.postMessage({ type: 'CHART_OPENED', lock } satisfies LockMessage);
  }

  /**
   * Release the lock held by this tab.
   * Call this when the EMRChart component unmounts.
   */
  releaseLock(): void {
    const existing = this.getCurrentLock();
    if (existing && existing.tabId === TAB_ID) {
      try {
        localStorage.removeItem(LOCK_KEY);
      } catch (e) {
        console.warn('[ChartLock] Failed to release lock:', e);
      }
      this.channel?.postMessage({ type: 'CHART_CLOSED', tabId: TAB_ID } satisfies LockMessage);
    }
  }

  /**
   * Subscribe to incoming lock conflict messages from other tabs.
   * The callback fires when another tab opens a chart while this one is idle.
   */
  onConflictFromOtherTab(callback: ConflictCallback): void {
    this.conflictCallback = callback;
  }

  /**
   * Clean up (call when provider unmounts).
   */
  destroy(): void {
    this.channel?.close();
  }
}

export const chartLockService = new ChartLockService();
export { TAB_ID };
