#!/usr/bin/env bash
set -euo pipefail
root_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
dist_dir="$root_dir/dist"
mkdir -p "$dist_dir"
rm -f "$dist_dir/orkut-digger-chrome.zip" "$dist_dir/orkut-digger-firefox.xpi"
cd "$root_dir"
7z a -bd -tzip "$dist_dir/orkut-digger-chrome.zip" manifest.json popup.html popup.js collector.html collector.css collector.js core.js README.md
7z a -bd -tzip "$dist_dir/orkut-digger-firefox.xpi" manifest.json popup.html popup.js collector.html collector.css collector.js core.js
printf 'Pacotes criados em %s\n' "$dist_dir"
