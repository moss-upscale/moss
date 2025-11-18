import os
import argparse
import shutil


def _candidates(lib: str | None) -> list[str]:
    items: list[str] = []
    if lib:
        d = os.path.abspath(lib)
        if os.path.isdir(d):
            items.append(d)
        parent = os.path.dirname(d)
        if os.path.isdir(parent):
            items.append(parent)
        bin1 = os.path.join(parent, "bin")
        if os.path.isdir(bin1):
            items.append(bin1)
        parent2 = os.path.dirname(parent)
        bin2 = os.path.join(parent2, "bin")
        if os.path.isdir(bin2):
            items.append(bin2)
    return list(dict.fromkeys(items))


def collect(lib: str | None, root: str | None, dest: str) -> int:
    srcs = _candidates(lib)
    if root and os.path.isdir(root):
        srcs.append(os.path.abspath(root))
    srcs = list(dict.fromkeys(srcs))
    os.makedirs(dest, exist_ok=True)
    n = 0
    for src in srcs:
        for r, _, fs in os.walk(src):
            for f in fs:
                if f.lower().endswith(".dll"):
                    shutil.copy2(os.path.join(r, f), os.path.join(dest, f))
                    n += 1
    print(f"copied={n} dest={dest} sources={','.join(srcs)}")
    return n


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--lib")
    p.add_argument("--root")
    p.add_argument("--dest", required=True)
    a = p.parse_args()
    collect(a.lib, a.root, a.dest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())