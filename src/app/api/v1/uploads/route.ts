import { guard, json, withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/api-session";
import { saveUpload } from "@/lib/storage";

export async function POST(req: Request) {
  return withApi(async () => {
    await guard(req, "upload", 40, 60 * 60 * 1000);
    const user = await requireApiUser();

    const form = await req.formData().catch(() => null);
    if (!form) {
      return json({ error: { code: "BAD_REQUEST", message: "Upload must be multipart form data." } }, { status: 400 });
    }
    const file = form.get("file");
    const kind = String(form.get("kind") || "POST");
    if (!(file instanceof File)) {
      return json({ error: { code: "BAD_REQUEST", message: "No file was provided." } }, { status: 400 });
    }
    if (!["AVATAR", "COVER", "POST", "STORY", "MESSAGE"].includes(kind)) {
      return json({ error: { code: "BAD_REQUEST", message: "Invalid upload type." } }, { status: 400 });
    }

    const saved = await saveUpload(file, kind, user.id);
    return json({ ok: true, upload: saved }, { status: 201 });
  });
}
