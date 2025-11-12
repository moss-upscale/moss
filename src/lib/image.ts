import type {ImageItem} from "@/state/app-store";
import {invoke} from "@tauri-apps/api/core";
import {getModelById} from "@/lib/models";

export async function processImage(
    item: ImageItem,
    modelId: string,
    targetScale: number,
    opts?: { outputDir?: string; overwrite?: boolean }
): Promise<{ outPath?: string; src?: string }> {
    const inputPath: string | undefined = item.path;
    if (!inputPath) {
        throw new Error("Missing native file path for image; use 'Add Images' or import from folder in the desktop app.");
    }
    const meta = getModelById(modelId);
    if (!meta) return {src: item.src};
    let outputDir = opts?.outputDir;
    if (!outputDir && inputPath) {
        const parts = inputPath.split("/");
        parts.pop();
        outputDir = parts.join("/") || ".";
    }
    if (!outputDir) return {src: item.src};

    const outPath = await invoke<string>("upscale_image", {
        inputPath: inputPath,
        modelFilename: meta.fileName,
        baseScale: meta.baseScale,
        targetScale: targetScale,
        outputDir: outputDir,
    });
    return {outPath};
}

export async function cancelProcessing(): Promise<void> {
    await invoke<void>("cancel_upscale");
}
