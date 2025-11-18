import os
import argparse
import hashlib
import platform
import subprocess
import tarfile
import urllib.request
import json


def workspace_path(arg_ws: str | None) -> str:
    return arg_ws or os.environ.get("GITHUB_WORKSPACE") or os.getcwd()


def write_outputs(out_path: str | None, data: dict[str, str]) -> None:
    path = out_path or os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a") as f:
            for k, v in data.items():
                f.write(f"{k}={v}\n")
    else:
        for k, v in data.items():
            print(f"{k}={v}")


def ensure_source(version: str) -> str:
    home = os.path.expanduser("~")
    src_root = os.path.join(home, "src")
    os.makedirs(src_root, exist_ok=True)
    src = os.path.join(src_root, f"opencv-{version}")
    if not os.path.isdir(src):
        tgz = os.path.join(src_root, f"opencv-{version}.tar.gz")
        url = f"https://github.com/opencv/opencv/archive/refs/tags/{version}.tar.gz"
        urllib.request.urlretrieve(url, tgz)
        with tarfile.open(tgz, "r:gz") as tf:
            tf.extractall(src_root)
    return src


def _list_modules(build_list: str) -> list[str]:
    return sorted(set(m for m in build_list.split(",") if m))


def compute_cache_key(namespace: str | None, build_list: str, version: str, shared: str) -> tuple[str, str]:
    ns = namespace or "opencv"
    mode = shared.upper()
    modules_hash = hashlib.sha256((build_list + "|" + mode).encode()).hexdigest()
    os_name = (os.environ.get("RUNNER_OS") or platform.system()).lower()
    arch = _normalize_arch(platform.machine()).lower()
    cache_key = f"{ns}-{os_name}-{arch}-{version}-{modules_hash}"
    return modules_hash, cache_key


def cmd_compute_key(args):
    modules_hash, cache_key = compute_cache_key(args.cache_namespace, args.build_list, args.opencv_version, args.shared)
    write_outputs(args.github_output, {"modules_hash": modules_hash, "cache_key": cache_key})


def cmd_build(args):
    workspace = workspace_path(args.workspace)
    src = ensure_source(args.opencv_version)
    root = os.path.join(workspace, ".opencv", args.opencv_version, args.modules_hash)
    mods = _list_modules(args.build_list)
    cmd = [
        "python3",
        ".github/tools/build_opencv_cross_platform.py",
        "--project-root",
        src,
        "--install-root",
        root,
        "--build-type",
        "Release",
        "--shared",
        args.shared,
        "--modules",
        *mods,
        "-v",
    ]
    print("$", " ".join(cmd))
    subprocess.run(cmd, check=True)


def _normalize_arch(machine: str) -> str:
    m = machine.lower()
    if m in ("x86_64", "amd64"):
        return "x86_64"
    if m in ("arm64", "aarch64"):
        return "arm64"
    return machine


def prefix_paths(workspace: str, version: str, modules_hash: str) -> tuple[str, str, str]:
    os_name = platform.system()
    arch = _normalize_arch(platform.machine())
    root = os.path.join(workspace, ".opencv", version, modules_hash)
    prefix = os.path.join(root, os_name, arch)
    include_root = os.path.join(prefix, "include")
    opencv4_dir = os.path.join(include_root, "opencv4")
    # Prefer a directory that directly contains "opencv2/core/version.hpp" relative to it
    if os.path.isdir(opencv4_dir) and os.path.isfile(os.path.join(opencv4_dir, "opencv2", "core", "version.hpp")):
        include_path = opencv4_dir
    else:
        include_path = include_root
    candidates = [
        os.path.join(prefix, "x64", "vc17", "lib"),
        os.path.join(prefix, "x64", "vc17", "staticlib"),
        os.path.join(prefix, "x64", "vc16", "lib"),
        os.path.join(prefix, "x64", "vc16", "staticlib"),
        os.path.join(prefix, "x64", "vc15", "lib"),
        os.path.join(prefix, "x64", "vc15", "staticlib"),
        os.path.join(prefix, "lib"),
        os.path.join(prefix, "staticlib"),
        os.path.join(prefix, "x64", "mingw", "lib"),
    ]
    lib_path = next((p for p in candidates if os.path.isdir(p)), candidates[0])
    return prefix, include_path, lib_path


def lib_names(build_list: str, lib_path: str) -> str:
    modules = _list_modules(build_list)
    try:
        if platform.system() == "Windows":
            entries = [e[:-4] for e in os.listdir(lib_path) if e.endswith(".lib") and e.startswith("opencv_")]
            names = {name for name in entries for m in modules if name.startswith(f"opencv_{m}")}
            return ",".join(sorted(names))
    except Exception:
        pass
    return ",".join(f"opencv_{m}" for m in modules)


def cmd_export_env(args):
    workspace = workspace_path(args.workspace)
    _, include_path, lib_path = prefix_paths(workspace, args.opencv_version, args.modules_hash)
    libs = lib_names(args.build_list, lib_path)
    write_outputs(args.github_output, {
        "opencv_link_libs": libs,
        "opencv_link_paths": lib_path,
        "opencv_include_paths": include_path,
    })


def cmd_export_rustflags(args):
    link_paths = args.link_paths
    if not link_paths:
        workspace = workspace_path(args.workspace)
        _, _, link_paths = prefix_paths(workspace, args.opencv_version, args.modules_hash)
    base = link_paths.strip()
    third = os.path.join(base, "opencv4", "3rdparty")
    search_dir = third if os.path.isdir(third) else base
    exts = [".lib"] if platform.system() == "Windows" else [".a"]
    files = []
    for root, _, fs in os.walk(search_dir):
        for f in fs:
            if any(f.endswith(ext) for ext in exts):
                p = os.path.join(root, f)
                if platform.system() == "Linux":
                    bn = os.path.basename(p)
                    if bn.startswith("lib") and "protobuf" in bn:
                        continue
                files.append(p)
    parts = [f"-C link-arg={path}" for path in files]
    if platform.system() == "Darwin":
        parts.extend([
            "-C link-arg=-framework",
            "-C link-arg=OpenCL",
            "-C link-arg=-framework",
            "-C link-arg=Accelerate",
            "-C link-arg=-framework",
            "-C link-arg=AppKit",
        ])
        try:
            p = subprocess.run(["brew", "--prefix"], capture_output=True, text=True)
            prefix = p.stdout.strip()
            if prefix:
                avif = os.path.join(prefix, "lib", "libavif.dylib")
                if os.path.isfile(avif):
                    parts.append(f"-C link-arg={avif}")
        except Exception:
            pass
    flags = " ".join(parts)
    write_outputs(args.github_output, {"rustflags": flags})


def cmd_read_config(args):
    with open(args.config, "r") as f:
        cfg = json.load(f)
    version = cfg.get("version") or cfg.get("opencv_version") or ""
    build_list = cfg.get("build_list") or ""
    shared = (cfg.get("shared") or "OFF").upper()
    write_outputs(args.github_output, {
        "opencv_version": version,
        "build_list": build_list,
        "shared": shared,
    })


def main():
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)

    s0 = sub.add_parser("read-config")
    s0.add_argument("--config", default=".github/opencv-config.json")
    s0.add_argument("--github-output")
    s0.set_defaults(func=cmd_read_config)

    s1 = sub.add_parser("compute-key")
    s1.add_argument("--cache-namespace")
    s1.add_argument("--build-list", required=True)
    s1.add_argument("--opencv-version", required=True)
    s1.add_argument("--shared", default="OFF", choices=["ON", "OFF"])
    s1.add_argument("--github-output")
    s1.set_defaults(func=cmd_compute_key)

    s2 = sub.add_parser("build")
    s2.add_argument("--opencv-version", required=True)
    s2.add_argument("--build-list", required=True)
    s2.add_argument("--modules-hash", required=True)
    s2.add_argument("--workspace")
    s2.add_argument("--shared", default="OFF", choices=["ON", "OFF"])
    s2.set_defaults(func=cmd_build)

    s3 = sub.add_parser("export-env")
    s3.add_argument("--workspace")
    s3.add_argument("--opencv-version", required=True)
    s3.add_argument("--modules-hash", required=True)
    s3.add_argument("--build-list", required=True)
    s3.add_argument("--github-output")
    s3.set_defaults(func=cmd_export_env)

    s4 = sub.add_parser("export-rustflags")
    s4.add_argument("--workspace")
    s4.add_argument("--opencv-version")
    s4.add_argument("--modules-hash")
    s4.add_argument("--link-paths")
    s4.add_argument("--github-output")
    s4.set_defaults(func=cmd_export_rustflags)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
