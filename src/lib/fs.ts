import {invoke} from "@tauri-apps/api/core";

export async function isImagePath(p: string): Promise<boolean> {
  return await invoke<boolean>("is_image_file", {path: p});
}

export async function collectImagePathsRecursive(
  rootDir: string
): Promise<string[]> {
  const list = await invoke<string[]>("list_images", {rootDir});
  return Array.from(new Set(list));
}
