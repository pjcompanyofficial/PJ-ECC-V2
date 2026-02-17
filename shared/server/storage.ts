import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
// modify the interface with any CRUD methods
// you might need
import { db } from "./db";
import {
  employees,
  type Employee,
  type InsertEmployee,
} from "@shared/schema";
import { eq } from "drizzle-orm";
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createEmployee(employee: InsertEmployee & { signature: string }): Promise<Employee>;
  getEmployeeByRef(refId: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
}
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  constructor() {
    this.users = new Map();
export class DatabaseStorage implements IStorage {
  async createEmployee(insertEmployee: InsertEmployee & { signature: string }): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  async getEmployeeByRef(refId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.refId, refId));
    return employee;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  async getAllEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }
}
export const storage = new MemStorage();
export const storage = new DatabaseStorage();
