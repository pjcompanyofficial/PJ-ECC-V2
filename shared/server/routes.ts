import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";
import { QR_SALT } from "@shared/schema";

// Simple in-memory session store for this MVP (since we don't have a full auth system setup yet)
// In a real production app, use proper session middleware with Redis/DB store
const adminSessions = new Set<string>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Admin Login
  app.post(api.admin.login.path, (req, res) => {
    const { key } = req.body;
    if (key === "sonu@jeet") {
      const token = crypto.randomBytes(16).toString("hex");
      adminSessions.add(token);
      
      // For simplicity in this specific request context, we'll rely on client storing the token
      // But we will also set a cookie for good measure if we were using cookie-parser
      return res.json({ success: true, token });
    }
    
    return res.status(401).json({ message: "Invalid Access Key" });
  });

  app.get(api.admin.verify.path, (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token && adminSessions.has(token)) {
      return res.json({ authenticated: true });
    }
    return res.status(401).json({ message: "Unauthorized" });
  });

  // Create Employee (Admin only)
  app.post(api.employees.create.path, async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || !adminSessions.has(token)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const input = api.employees.create.input.parse(req.body);

      // Generate Signature on Server
      // Signature = SHA256(Name + RefID + SALT)
      const signature = crypto
        .createHash("sha256")
        .update(input.name + input.refId + QR_SALT)
        .digest("hex")
        .substring(0, 15);

      const employee = await storage.createEmployee({ ...input, signature });
      res.status(201).json(employee);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      
      // Handle unique constraint violation
      return res.status(500).json({ message: "Internal Server Error or Duplicate Ref ID" });
    }
  });

  // Get All Employees (Admin only)
  app.get(api.employees.list.path, async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token || !adminSessions.has(token)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const list = await storage.getAllEmployees();
    res.json(list);
  });

  // Verify QR Token
  app.post(api.employees.verify.path, async (req, res) => {
    try {
      const { token } = req.body;
      // Token is base64 encoded JSON
      const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
      const data = JSON.parse(decodedStr);

      // Data structure expected: { n: name, r: refId, g: gender, p: purpose, e: expiry, sig: signature }
      
      // Check signature
      const expectedSig = crypto
        .createHash("sha256")
        .update(data.n + data.r + QR_SALT)
        .digest("hex")
        .substring(0, 15);

      if (data.sig !== expectedSig) {
        return res.json({ valid: false, message: "Invalid Signature" });
      }

      // Check DB for revocation status (optional, but good practice)
      const employee = await storage.getEmployeeByRef(data.r);

      if (!employee) {
        // Even if signature is valid (stateless), if they aren't in DB, it might be an old revoked card
        // For now, if we want strictly stateless, we can skip this.
        // But "Secure Portal" implies we should check our records.
        // However, the user's logic was purely stateless. Let's support both.
        // If in DB, return DB version. If not, return decoded version but warn?
        // Let's stick to DB source of truth if available, otherwise strictly trust signature.
        // Actually, for "Verify", let's return the decoded data if valid.
      }

      return res.json({
        valid: true,
        employee: employee || {
          id: 0,
          name: data.n,
          refId: data.r,
          gender: data.g,
          purpose: data.p,
          expiry: data.e === "LIFETIME" ? null : new Date(data.e),
          isLifetime: data.e === "LIFETIME",
          signature: data.sig,
          valid: true,
          createdAt: new Date()
        }
      });

    } catch (e) {
      return res.json({ valid: false, message: "Malformed Token" });
    }
  });

  return httpServer;
}

