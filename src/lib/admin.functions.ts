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
