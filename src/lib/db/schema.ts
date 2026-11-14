import { relations, sql } from "drizzle-orm";
import {
  boolean,
  char,
  date,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  feedbackCategories,
  feedbackStatuses,
  memberRoles,
  seasonTypes,
  vacationStatuses,
} from "./enums";

export * from "./enums";

const createdAt = () =>
  datetime("created_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () =>
  datetime("updated_at", { mode: "date" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date());

export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  memberNo: varchar("member_no", { length: 20 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  role: mysqlEnum("role", memberRoles).notNull().default("member"),
  street: varchar("street", { length: 200 }),
  postalCode: varchar("postal_code", { length: 20 }),
  city: varchar("city", { length: 100 }),
  country: char("country", { length: 2 }),
  failedLogins: int("failed_logins").notNull().default(0),
  lockedUntil: datetime("locked_until", { mode: "date" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = mysqlTable(
  "sessions",
  {
    /** SHA-256 (hex) des Cookie-Tokens; das Token selbst wird nie gespeichert. */
    id: char("id", { length: 64 }).primaryKey(),
    memberId: int("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    createdAt: createdAt(),
    userAgent: varchar("user_agent", { length: 255 }),
  },
  (t) => [
    index("sessions_member_idx").on(t.memberId),
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

export const resorts = mysqlTable("resorts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  location: varchar("location", { length: 150 }).notNull(),
  country: char("country", { length: 2 }).notNull(),
  description: text("description").notNull(),
  amenities: json("amenities").$type<string[]>().notNull(),
  checkInTime: time("check_in_time").notNull().default("15:00:00"),
  checkOutTime: time("check_out_time").notNull().default("10:00:00"),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  imageUrl: varchar("image_url", { length: 500 }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const seasons = mysqlTable(
  "seasons",
  {
    id: int("id").autoincrement().primaryKey(),
    resortId: int("resort_id")
      .notNull()
      .references(() => resorts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    type: mysqlEnum("type", seasonTypes).notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
  },
  (t) => [index("seasons_resort_start_idx").on(t.resortId, t.startDate)],
);

export const feedback = mysqlTable(
  "feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    memberId: int("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    resortId: int("resort_id").references(() => resorts.id, { onDelete: "set null" }),
    category: mysqlEnum("category", feedbackCategories).notNull(),
    subject: varchar("subject", { length: 150 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", feedbackStatuses).notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("feedback_member_created_idx").on(t.memberId, t.createdAt)],
);

export const vacationRequests = mysqlTable(
  "vacation_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    memberId: int("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    resortId: int("resort_id")
      .notNull()
      .references(() => resorts.id, { onDelete: "restrict" }),
    seasonId: int("season_id").references(() => seasons.id, { onDelete: "set null" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    guests: tinyint("guests", { unsigned: true }).notNull(),
    note: text("note"),
    status: mysqlEnum("status", vacationStatuses).notNull().default("pending"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vacation_member_created_idx").on(t.memberId, t.createdAt)],
);

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    memberId: int("member_id").references(() => members.id, { onDelete: "set null" }),
    action: varchar("action", { length: 50 }).notNull(),
    ip: varchar("ip", { length: 45 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_member_idx").on(t.memberId),
    // Für das Login-Limit pro IP (WP3): Fehlversuche je IP im Zeitfenster zählen.
    index("audit_ip_action_created_idx").on(t.ip, t.action, t.createdAt),
  ],
);

export const membersRelations = relations(members, ({ many }) => ({
  sessions: many(sessions),
  feedback: many(feedback),
  vacationRequests: many(vacationRequests),
}));

export const resortsRelations = relations(resorts, ({ many }) => ({
  seasons: many(seasons),
}));

export const seasonsRelations = relations(seasons, ({ one }) => ({
  resort: one(resorts, { fields: [seasons.resortId], references: [resorts.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  member: one(members, { fields: [feedback.memberId], references: [members.id] }),
  resort: one(resorts, { fields: [feedback.resortId], references: [resorts.id] }),
}));

export const vacationRequestsRelations = relations(vacationRequests, ({ one }) => ({
  member: one(members, { fields: [vacationRequests.memberId], references: [members.id] }),
  resort: one(resorts, { fields: [vacationRequests.resortId], references: [resorts.id] }),
  season: one(seasons, { fields: [vacationRequests.seasonId], references: [seasons.id] }),
}));

export type Member = typeof members.$inferSelect;
export type Resort = typeof resorts.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type VacationRequest = typeof vacationRequests.$inferSelect;
