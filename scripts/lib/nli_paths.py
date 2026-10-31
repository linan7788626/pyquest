#!/usr/bin/env python3
"""Shared NLI path authority for the pyquest exporter/check scripts.

Arrangement (2026-10-30 external asset-source migration, spec
.scratch/external-assets-migration/spec.md):

  - project root  : this game checkout (derived from this file's location,
                    never from the process CWD);
  - runtime       : <root>/public/nli-preview — the tracked 72-file runtime
                    bundle (70 PNGs + manifest.json + README.md) served by
                    Vite publicDir 'public' at the unchanged browser URLs
                    /nli-preview/*;
  - raw source    : the read-only external source project holding the
                    NLI_SoftFantasy_ARPG_v0.2 sprite pack, resolved as
                    $PYQUEST_ASSET_ROOT when set, otherwise the default
                    sibling <root>/../soft-fantasy-arpg-assets.

Pure resolution only: importing this module never touches the filesystem
beyond reading this file's location, never mutates or copies the source
project, and never checks anything out. Explicit --source/--assets CLI
overrides in the individual scripts stay authoritative; this module only
supplies their defaults.
"""
import os
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # keep scripts/ free of __pycache__ side effects

ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SIBLING_SOURCE = ROOT.parent / "soft-fantasy-arpg-assets"
ASSET_ROOT_ENV = "PYQUEST_ASSET_ROOT"


def project_root():
    """The pyquest game checkout containing scripts/lib/."""
    return ROOT


def runtime_root():
    """Tracked runtime bundle directory (Vite publicDir target)."""
    return ROOT / "public" / "nli-preview"


def source_root():
    """Raw source project root: $PYQUEST_ASSET_ROOT or the default sibling.

    In this checkout the default resolves to
    /Users/uranus/Developer/GitHub/soft-fantasy-arpg-assets (read-only).
    """
    env = os.environ.get(ASSET_ROOT_ENV)
    if env:
        return Path(env).resolve()
    return DEFAULT_SIBLING_SOURCE.resolve()


def before_root():
    """Committed technical-seed directory for the frozen ts_shadow input."""
    return ROOT / "scripts" / "inputs" / "nli"
