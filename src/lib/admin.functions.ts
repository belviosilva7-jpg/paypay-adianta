import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.password === adminPassword) {
      return { success: true };
    }
    throw new Error("Invalid password");
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    id: z.string().uuid(),
    isCorrect: z.boolean(),
    adminPassword: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const adminPassword = process.env['ADMIN_PASSWORD'] || "moneytool";
    if (data.adminPassword !== adminPassword) {
      throw new Error("Unauthorized");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const status = "Reprovado";
    const reason = data.isCorrect ? "Não se qualifica" : "Dados incorretos";
    
    const payload = { 
      status, 
      rejection_reason: reason,
      analysis_color: data.isCorrect ? 'green' : 'red'
    };
    
    const { error } = await supabaseAdmin
      .from("pending_applications")
      .update(payload)
      .eq("id", data.id);
    
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    id: z.string().uuid(),
    adminPassword: z.string(),
  }).parse(data))
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
    
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getApplications = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    adminPassword: z.string(),
  }).parse(data))
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
    
    if (error) throw new Error(error.message);
    return apps;
  });

export const checkApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    nif: z.string().min(9),
  }).parse(data))
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
