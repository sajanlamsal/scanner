export type TicketStatus = "registered" | "checked_in";

export type ScanResult =
  | "success"
  | "already_scanned"
  | "not_found"
  | "inactive";

export interface Ticket {
  id: string;
  attendeeName: string;
  status: TicketStatus;
  active: boolean;
  barcode: string;
  event: string;
  checkedInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedTicket {
  id: string;
  attendeeName: string;
  status: TicketStatus;
  active: boolean;
  checkedInAt: string | null;
}

export interface ScanLog {
  id: string;
  barcode: string;
  scannedAt: Date;
  result: ScanResult;
  attendeeName: string | null;
}

export interface EventStats {
  total: number;
  checkedIn: number;
}

export interface RecentScanEntry {
  barcode: string;
  attendeeName: string | null;
  result: ScanResult;
  scannedAt: string;
}

export interface ScanResponse {
  result: ScanResult;
  attendeeName?: string;
  checkedInAt?: string;
  message: string;
}
