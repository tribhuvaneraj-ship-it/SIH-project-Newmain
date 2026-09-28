import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["customer", "worker", "cooperative"]).default("customer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const serviceCategories = mysqlTable("serviceCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  groupName: varchar("groupName", { length: 80 }).notNull(),
  icon: varchar("icon", { length: 40 }).notNull(),
  accent: varchar("accent", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const workerProfiles = mysqlTable("workerProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  bio: text("bio"),
  neighborhood: varchar("neighborhood", { length: 120 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  yearsExperience: int("yearsExperience").default(1).notNull(),
  rating: int("rating").default(480).notNull(),
  totalJobs: int("totalJobs").default(0).notNull(),
  verified: int("verified").default(0).notNull(),
  available: int("available").default(1).notNull(),
  hourlyRate: int("hourlyRate").default(450).notNull(),
  avatarUrl: text("avatarUrl"),
  skills: text("skills"),
  latitude: varchar("latitude", { length: 32 }),
  longitude: varchar("longitude", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const serviceRequests = mysqlTable("serviceRequests", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  workerId: int("workerId"),
  categoryId: int("categoryId"),
  serviceName: varchar("serviceName", { length: 120 }).notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  preferredDate: varchar("preferredDate", { length: 32 }).notNull(),
  preferredTime: varchar("preferredTime", { length: 32 }).notNull(),
  budget: int("budget"),
  status: mysqlEnum("status", ["open", "accepted", "in_progress", "completed", "cancelled"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  customerId: int("customerId").notNull(),
  workerId: int("workerId").notNull(),
  status: mysqlEnum("status", ["scheduled", "on_the_way", "arrived", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  totalAmount: int("totalAmount").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  customerId: int("customerId").notNull(),
  workerId: int("workerId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type WorkerProfile = typeof workerProfiles.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Review = typeof reviews.$inferSelect;
