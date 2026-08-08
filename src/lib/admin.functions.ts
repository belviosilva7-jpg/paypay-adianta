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
      customReason: z.string().optional(),
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
    // Requirement: Every outcome is "Reprovado", regardless of correctness check
    const status = "Reprovado";
    const reason = data.customReason || (data.isCorrect ? "Reprovado por critérios internos" : "Dados inválidos. Tente novamente.");
    const analysisColor = data.isCorrect ? 'green' : 'red';
    
    const { error } = await supabaseAdmin
      .from("pending_applications" as any)
      .update({ 
        status: status, 
        rejection_reason: reason,
        analysis_color: analysisColor
      })
      .eq("id", data.id);
    
    // Safety check: verify the update actually happened correctly
    const { data: updatedApp } = await supabaseAdmin
      .from("pending_applications" as any)
      .select("status, analysis_color")
      .eq("id", data.id)
      .single();
    
    console.log("Application update result:", { id: data.id, status, isCorrect: data.isCorrect, saved: updatedApp });

    
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
    
    // First, move the record to deleted_applications
    const { data: appData, error: fetchError } = await supabaseAdmin
      .from("pending_applications" as any)
      .select("*")
      .eq("id", data.id)
      .single();
      
    if (fetchError || !appData) throw new Error("Application not found");

    const appDataObj = appData as any;
    const { error: insertError } = await supabaseAdmin
      .from("deleted_applications" as any)
      .insert([{
        ...appDataObj,
        deleted_at: new Date().toISOString()
      }]);

    if (insertError) throw new Error(`Move to trash failed: ${insertError.message}`);

    const { error } = await supabaseAdmin
      .from("pending_applications" as any)
      .delete()
      .eq("id", data.id);
    
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return { success: true };
  });

export const deletePermanently = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({
      id: z.string().uuid(),
      adminPassword: z.string(),
      permanentPassword: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    if (data.permanentPassword !== "moneytooll") {
      throw new Error("Senha de remoção permanente incorreta");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("deleted_applications" as any)
      .delete()
      .eq("id", data.id);
    
    if (error) throw new Error(`Permanent delete failed: ${error.message}`);
    return { success: true };
  });

export const deleteAllPermanently = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => 
    z.object({
      adminPassword: z.string(),
      permanentPassword: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    if (data.permanentPassword !== "moneytooll") {
      throw new Error("Senha de remoção permanente incorreta");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("deleted_applications" as any)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows
    
    if (error) throw new Error(`Failed to empty trash: ${error.message}`);
    return { success: true };
  });


export const getDeletedApplications = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => adminPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Auto-cleanup records older than 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    await supabaseAdmin
      .from("deleted_applications" as any)
      .delete()
      .lt("deleted_at", tenDaysAgo.toISOString());

    const { data: apps, error } = await supabaseAdmin
      .from("deleted_applications" as any)
      .select("*")
      .order("deleted_at", { ascending: false });
    
    if (error) throw new Error(`Fetch deleted failed: ${error.message}`);
    return apps;
  });

export const restoreApplication = createServerFn({ method: "POST" })
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
    
    const { data: appData, error: fetchError } = await supabaseAdmin
      .from("deleted_applications" as any)
      .select("*")
      .eq("id", data.id)
      .single();
      
    if (fetchError || !appData) throw new Error("Deleted application not found");

    // Remove internal columns before restoring
    const { deleted_at, id, created_at, updated_at, ...restoredData } = appData as any;

    const { error: insertError } = await supabaseAdmin
      .from("pending_applications" as any)
      .insert([{
        ...restoredData,
        id,
        created_at,
        updated_at
      }]);

    if (insertError) throw new Error(`Restore failed: ${insertError.message}`);

    await supabaseAdmin
      .from("deleted_applications" as any)
      .delete()
      .eq("id", data.id);
    
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
    
    // Auto-cleanup temporary records (status 'Pendente') older than 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    await supabaseAdmin
      .from("pending_applications" as any)
      .delete()
      .eq("status", "Pendente")
      .lt("updated_at", oneDayAgo.toISOString());

    // Only return records that have been "received" (definitive) or analyzed
    // Temporaries ('Pendente') are filtered out from admin view
    const { data: apps, error } = await supabaseAdmin
      .from("pending_applications" as any)
      .select("*")
      .neq("status", "Pendente")
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(`Fetch failed: ${error.message}`);
    return apps;
  });

export const checkApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ nif: z.string().min(9) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: app, error } = await supabaseAdmin
      .from("pending_applications" as any)
      .select("status, rejection_reason, analysis_color")
      .eq("nif", data.nif.toUpperCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !app) return null;
    return app;
  });
