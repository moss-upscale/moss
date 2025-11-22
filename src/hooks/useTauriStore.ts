import {useEffect, useMemo, useRef, useState} from "react";
import {Store} from "@tauri-apps/plugin-store";
import {emit, listen} from "@tauri-apps/api/event";

export type StoreHookOptions<T> = {
  validate?: (v: unknown) => v is T;
  file?: string;
};

export function useTauriStore<T>(
  key: string,
  initial: T,
  options?: StoreHookOptions<T>
) {
  const file = options?.file ?? "moss.bin";
  const validate = options?.validate;

  const storeRef = useRef<Store | null>(null);
  const [value, setValue] = useState<T>(initial);
  const [error, setError] = useState<Error | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await Store.load(file);
        storeRef.current = s;
        const raw = await s.get(key);
        if (!alive) return;
        if (raw !== undefined) {
          const ok = validate ? validate(raw) : true;
          setValue(ok ? (raw as T) : initial);
        } else {
          setValue(initial);
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        setValue(initial);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    const unlistenPromise = listen("app:store:update", (evt) => {
      const payload = evt.payload as { key?: string; value?: unknown };
      if (!payload || payload.key !== key) return;
      const ok = validate ? validate(payload.value) : true;
      if (ok) setValue(payload.value as T);
    });
    return () => {
      alive = false;
      void unlistenPromise.then((un) => un());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, file]);

  const setStoredValue = useMemo(() => {
    return (next: T | ((prev: T) => T)) => {
      const nextVal =
        typeof next === "function" ? (next as (p: T) => T)(value) : next;
      setValue(nextVal);
      const s = storeRef.current;
      if (!s) return;
      void (async () => {
        try {
          await s.set(key, nextVal as unknown as object);
          await s.save();
          await emit("app:store:update", { key, value: nextVal });
        } catch (e) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })();
    };
  }, [key, value]);

  return [value, setStoredValue, { error, loaded }] as const;
}
