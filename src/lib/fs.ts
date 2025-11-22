import {readDir} from "@tauri-apps/plugin-fs";
import {join} from "@tauri-apps/api/path";

export const IMAGE_EXTS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
] as const;

export function isImagePath(p: string): boolean {
  const lower = p.toLowerCase();
  return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
}

export async function collectImagePathsRecursive(
  rootDir: string
): Promise<string[]> {
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readDir(dir);
    for (const entry of entries as any[]) {
      const itemPath: string =
        typeof entry.path === "string"
          ? entry.path
          : typeof entry.name === "string"
          ? await join(dir, entry.name)
          : dir;
      const isDir =
        Boolean((entry as any).children) || Boolean((entry as any).isDirectory);
      if (isDir) {
        await walk(itemPath);
      } else if (isImagePath(itemPath)) {
        result.push(itemPath);
      }
    }
  }

  await walk(rootDir);
  return Array.from(new Set(result));
}
