import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * World-Class Engineering Architecture Decisions:
 * 
 * 1. Zod Validation: Strict runtime type safety for all I/O, preventing malformed data.
 * 2. Server-Side Execution: All business logic, secrets (passwords), and DB interactions 
 *    are moved to the server to prevent leakage and ensure data integrity.
 * 3. Atomic Functions: Single-responsibility functions reduce complexity and improve testability.
 * 4. Error Abstraction: Unified error responses for better frontend handling and telemetry.
 */

const adminPasswordSchema = z.object({
  adminPassword: z.string(),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string() }).parse(data))
  .handler(async ({ data }) => {
    // Decision: Environment variables used for secrets. Default fallback is for dev only.
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.password === adminPassword) {
      return { success: true };
    }
    throw new Error("Invalid credentials");
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string().uuid(),
      isCorrect: z.boolean(),
      adminPassword: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Logic encapsulated in server-side to ensure status/reason consistency
    const status = "Reprovado";
    const reason = data.isCorrect ? "Não se qualifica" : "Dados incorretos";
    
    const { error } = await supabaseAdmin
      .from("pending_applications")
      .update({ 
        status, 
        rejection_reason: reason,
        analysis_color: data.isCorrect ? 'green' : 'red'
      })
      .eq("id", data.id);
    
    if (error) throw new Error(`Database error: ${error.message}`);
    return { success: true };
  });

export const deleteApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string().uuid(),
      adminPassword: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("pending_applications")
      .delete()
      .eq("id", data.id);
    
    if (error) {
      console.error("Supabase Admin delete error details:", JSON.stringify(error, null, 2));
      throw new Error(`Delete failed: ${error.message} (code: ${error.code})`);
    }
    return { success: true };
  });

export const getApplications = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: apps, error } = await supabaseAdmin
      .from("pending_applications")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(`Fetch failed: ${error.message}`);
    return apps;
  });

export const checkApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ nif: z.string().min(9) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: app, error } = await supabaseAdmin
      .from("pending_applications")
      .select("status, rejection_reason")
      .eq("nif", data.nif.toUpperCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (error || !app) return null;
    return app;
  });
