import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "registered",
  "checked_in",
]);

export const scanResultEnum = pgEnum("scan_result", [
  "success",
  "already_scanned",
  "not_found",
  "inactive",
]);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attendeeName: text("attendee_name").notNull(),
    status: ticketStatusEnum("status").notNull().default("registered"),
    active: boolean("active").notNull().default(true),
    barcode: text("barcode").notNull().unique(),
    event: text("event").notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("tickets_barcode_idx").on(table.barcode)]
);

export const scanLogs = pgTable("scan_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  barcode: text("barcode").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  result: scanResultEnum("result").notNull(),
  attendeeName: text("attendee_name"),
});

export type TicketInsert = typeof tickets.$inferInsert;
export type TicketSelect = typeof tickets.$inferSelect;
export type ScanLogInsert = typeof scanLogs.$inferInsert;
