import { supabase } from "@/lib/supabase";
import type { CreateStoreReportInput } from "@/types/report";

export async function createStoreReport(input: CreateStoreReportInput) {
  const { error } = await supabase.from("store_reports").insert({
    store_id: input.store_id,
    reason: input.reason,
    detail: input.detail ?? null,
  });

  if (error) {
    throw error;
  }
}
