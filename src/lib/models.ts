export type Model = {
    id: string;
    scenes: string[];
    fileName: string;
    baseScale: number;
};

export const MODELS: Model[] = [
    {
        id: "real-esrgan-x4",
        scenes: ["general"],
        fileName: "realesrgan_x4plus.onnx",
        baseScale: 4,
    },
    {
        id: "real-esrgan-anime-x4",
        scenes: ["anime"],
        fileName: "realesrgan_x4plus_anime.onnx",
        baseScale: 4,
    },
];

export function getModelById(id: string): Model | undefined {
    return MODELS.find((m) => m.id === id);
}
