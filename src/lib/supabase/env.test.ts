import { describe, expect, it, vi } from "vitest";
import { getSupabaseUrl } from "@/lib/supabase/env";

describe("getSupabaseUrl", () => {
  it("accepts a project origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
  });

  it("normalizes accidental API paths", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co/rest/v1/");
    expect(getSupabaseUrl()).toBe("https://example.supabase.co");
  });
});
