import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_ROOT } from "@/lib/uploads";

/**
 * Serves uploaded menu photos from the Docker volume.
 * Path shape is locked down so nothing outside UPLOAD_ROOT is reachable.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const relative = parts.join("/");

  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.webp$/.test(relative)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(path.join(UPLOAD_ROOT, relative));
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
