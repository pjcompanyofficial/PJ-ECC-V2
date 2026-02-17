import { z } from 'zod';
import { insertEmployeeSchema, employees } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  admin: {
    login: {
      method: 'POST' as const,
      path: '/api/admin/login' as const,
      input: z.object({ key: z.string() }),
      responses: {
        200: z.object({ success: z.boolean(), token: z.string().optional() }),
        401: errorSchemas.unauthorized,
      },
    },
    verify: {
        method: 'GET' as const,
        path: '/api/admin/verify' as const,
        responses: {
            200: z.object({ authenticated: z.boolean() })
        }
    }
  },
  employees: {
    list: {
      method: 'GET' as const,
      path: '/api/employees' as const,
      responses: {
        200: z.array(z.custom<typeof employees.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/employees' as const,
      input: insertEmployeeSchema,
      responses: {
        201: z.custom<typeof employees.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/employees/:refId' as const,
      responses: {
        200: z.custom<typeof employees.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    verify: {
      method: 'POST' as const,
      path: '/api/verify-qr' as const,
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ 
          valid: z.boolean(), 
          employee: z.custom<typeof employees.$inferSelect>().optional(),
          message: z.string().optional()
        }),
      },
    }
  },
};

// ============================================
// HELPERS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
