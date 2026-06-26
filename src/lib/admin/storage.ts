import { supabase } from "@/integrations/supabase/client";

/** Upload to a private bucket and return a long-lived signed URL. */
export async function uploadSigned(bucket: string, file: File, folder = ""): Promise<string> {
  const path = `${folder}${folder ? "/" : ""}${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage.from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (sErr) throw sErr;
  return data.signedUrl;
}
