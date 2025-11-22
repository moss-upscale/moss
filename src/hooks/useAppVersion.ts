import {useEffect, useState} from "react";
import {getVersion} from "@tauri-apps/api/app";

export function useAppVersion() {
  const [version, setVersion] = useState<string>("");
  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const v = await getVersion();
        if (m) setVersion(v);
      } catch {
        if (m) setVersion("");
      }
    })();
    return () => {
      m = false;
    };
  }, []);
  return version;
}
