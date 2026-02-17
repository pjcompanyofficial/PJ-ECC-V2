import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { pgTable, text, serial, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
// === TABLE DEFINITIONS ===
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  refId: text("ref_id").notNull().unique(), // Employee ID / Ref ID
  gender: text("gender").notNull(),
  purpose: text("purpose").notNull(),
  expiry: timestamp("expiry"), // Null if lifetime
  isLifetime: boolean("is_lifetime").default(false),
  signature: text("signature").notNull(), // Cryptographic signature
  valid: boolean("valid").default(true), // Can revoke cards
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
// === SCHEMAS ===
export const insertEmployeeSchema = createInsertSchema(employees).omit({ 
  id: true, 
  createdAt: true,
  valid: true,
  signature: true // Generated on backend
}).extend({
  expiry: z.string().optional().nullable(), // Allow string input for date
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
// === TYPES ===
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
// Request types
export type CreateEmployeeRequest = InsertEmployee;
export type VerifyCardRequest = { token: string }; 
export type AdminLoginRequest = { key: string };
// Response types
export interface AdminAuthResponse {
  success: boolean;
  token?: string;
}
export interface VerificationResponse {
  valid: boolean;
  employee?: Employee;
  message?: string;
}
export const QR_SALT = "PJ_ECC_ULTIMATE_99"; // Keeping the user's salt
