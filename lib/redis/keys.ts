/** Redis key helpers — single source of truth for all key names */

/** Cached ticket data for a barcode */
export const ticketKey = (barcode: string) => `ticket_${barcode}`;

/** Hash: fields `total` and `checkedIn` */
export const statsKey = () => `event:stats`;

/** List of recent scan results (capped at 50) */
export const recentScansKey = () => `recent_scans`;

export const RECENT_SCANS_MAX = 50;
export const RECENT_SCANS_DISPLAY = 10;
