from __future__ import annotations

import argparse
import logging
import os
import platform
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

PROJECT_ROOT = Path.cwd()
BUILD_ROOT = PROJECT_ROOT / "build_cross"

DEFAULT_MODULES = ("core", "imgproc", "imgcodecs", "dnn")


@dataclass(slots=True)
class BuildOptions:
    os_name: Literal["Windows", "Darwin", "Linux"]
    arch: str
    build_type: Literal["Debug", "Release", "RelWithDebInfo", "MinSizeRel"]
    shared: Literal["ON", "OFF"]
    modules: list[str]
    install_root: Path
    dry_run: bool
    project_root: Path
    verbose: int


def setup_logging(verbose: int) -> None:
    level = logging.WARNING
    if verbose >= 2:
        level = logging.DEBUG
    elif verbose == 1:
        level = logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s: %(message)s", handlers=[logging.StreamHandler(sys.stdout)])


def cpu_count() -> int:
    return os.cpu_count() or 4


def sanitize_env() -> None:
    for k in ("CPATH", "C_INCLUDE_PATH", "CPLUS_INCLUDE_PATH"):
        os.environ.pop(k, None)


def run(cmd: list[str], dry_run: bool = False) -> None:
    logging.info("$ %s", " ".join(cmd))
    if dry_run:
        return
    subprocess.run(cmd, check=True)


def detect_os() -> Literal["Windows", "Darwin", "Linux"]:
    sys_name = platform.system()
    if sys_name not in {"Windows", "Darwin", "Linux"}:
        raise RuntimeError(f"Unsupported OS: {sys_name}")
    return sys_name


def normalize_arch(machine: str) -> str:
    m = machine.lower()
    if m in {"x86_64", "amd64"}:
        return "x86_64"
    if m in {"arm64", "aarch64"}:
        return "arm64"
    return machine


def read_modules_list(project_root: Path, modules_cli: list[str] | None) -> list[str]:
    items = list(modules_cli) if modules_cli else list(DEFAULT_MODULES)
    valid = [m for m in items if (project_root / "modules" / m).is_dir()]
    return valid or items


def cmake_generator_args(os_name: str) -> list[str]:
    if os_name == "Windows":
        return ["-G", "Visual Studio 17 2022"]
    return ["-G", "Ninja"] if shutil.which("ninja") else []


def configure_dir(opts: BuildOptions) -> Path:
    return BUILD_ROOT / "out" / opts.os_name / opts.arch


def install_prefix(opts: BuildOptions) -> Path:
    return opts.install_root / opts.os_name / opts.arch


def common_cmake_args(opts: BuildOptions) -> list[str]:
    args = [
        "-DCMAKE_BUILD_TYPE=" + opts.build_type,
        "-DCMAKE_INSTALL_PREFIX=" + str(install_prefix(opts)),
        "-DBUILD_LIST=" + ",".join(opts.modules),
        "-DBUILD_TESTS=OFF",
        "-DBUILD_PERF_TESTS=OFF",
        "-DBUILD_EXAMPLES=OFF",
        "-DBUILD_SHARED_LIBS=" + opts.shared,
        "-DCMAKE_POSITION_INDEPENDENT_CODE=ON",
        "-DCMAKE_CXX_STANDARD=17",
        "-DCMAKE_CXX_STANDARD_REQUIRED=ON",
        "-DCMAKE_C_STANDARD=11",
        "-DCMAKE_C_STANDARD_REQUIRED=ON",
        "-DCMAKE_INCLUDE_DIRECTORIES_PROJECT_BEFORE=ON",
        "-DOPENCV_FORCE_3RDPARTY_BUILD=ON",
        "-DWITH_PROTOBUF=OFF",
        "-DBUILD_PROTOBUF=OFF",
        "-DOPENCV_DNN_USE_PROTOBUF=OFF",
    ]
    if opts.os_name == "Darwin":
        args.append("-DCMAKE_OSX_ARCHITECTURES=" + opts.arch)
    if opts.os_name == "Windows":
        args.extend(["-A", "x64", "-T", "v143"])
    return args


def configure_build_install(opts: BuildOptions) -> None:
    build_dir = configure_dir(opts)
    if build_dir.exists():
        shutil.rmtree(build_dir)
    gen = cmake_generator_args(opts.os_name)
    base_cmd = [
        "cmake",
        "-S",
        str(opts.project_root),
        "-B",
        str(build_dir),
        *gen,
        *common_cmake_args(opts),
    ]
    run(base_cmd, opts.dry_run)
    run(["cmake", "--build", str(build_dir), "--config", opts.build_type, "--parallel", str(cpu_count())], opts.dry_run)
    run(["cmake", "--install", str(build_dir)], opts.dry_run)


def parse_args(argv: list[str]) -> BuildOptions:
    p = argparse.ArgumentParser(prog="build_cross_platform.py", description="Simplified cross-platform CMake build orchestrator.")
    p.add_argument("--build-type", default="Release", choices=["Debug", "Release", "RelWithDebInfo", "MinSizeRel"])
    p.add_argument("--shared", default="ON", choices=["ON", "OFF"])
    p.add_argument("--modules", nargs="*")
    p.add_argument("--install-root", type=Path, default=BUILD_ROOT / "sdk")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--project-root", type=Path, default=PROJECT_ROOT)
    p.add_argument("-v", "--verbose", action="count", default=0)
    a = p.parse_args(argv)

    os_name = detect_os()
    arch = normalize_arch(platform.machine())
    modules = read_modules_list(a.project_root, a.modules)
    return BuildOptions(
        os_name=os_name,
        arch=arch,
        build_type=a.build_type,
        shared=a.shared,
        modules=modules,
        install_root=a.install_root,
        dry_run=a.dry_run,
        project_root=a.project_root,
        verbose=a.verbose,
    )


def main(argv: list[str] | None = None) -> int:
    opts = parse_args(argv or sys.argv[1:])
    setup_logging(opts.verbose)
    sanitize_env()
    logging.info("OS: %s", opts.os_name)
    logging.info("Arch: %s", opts.arch)
    logging.info("Modules: %s", ",".join(opts.modules))
    try:
        configure_build_install(opts)
    except subprocess.CalledProcessError as e:
        logging.error("Command failed: %s", e)
        return 1
    except Exception as e:
        logging.error("Unexpected error: %s", e)
        return 1
    logging.info("Done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
