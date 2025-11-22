const modules = import.meta.glob("@/styles/themes/*.css", { eager: true });
void modules;

export const AVAILABLE_THEMES: string[] = [
  "default",
  ...Object.keys(modules).map((p) => p.split("/").pop()!.replace(/\.css$/, "")),
];
