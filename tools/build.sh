#!/bin/sh
# Zip the game for itch ("HTML" kind, "played in the browser"). index.html sits at the zip root.
# usage: tools/build.sh [name]   -> dist/<name>.zip, fails if over 10 MB
set -e
cd "$(dirname "$0")/.."
NAME=${1:-$(basename "$PWD" | tr 'A-Z' 'a-z')}
OUT="dist/$NAME.zip"
mkdir -p dist
rm -f "$OUT"
zip -qr -9 "$OUT" index.html src lib assets -x '*.DS_Store' -x 'assets/raw/*'
BYTES=$(stat -f %z "$OUT")
LIMIT=$((10 * 1024 * 1024))
MB=$(awk -v b="$BYTES" 'BEGIN { printf "%.2f", b / 1048576 }')
FILES=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
echo "$OUT $MB MB ($FILES files)"
if [ "$BYTES" -gt "$LIMIT" ]; then echo "FAIL: over 10 MB, shrink assets (webp, mono 96k mp3/ogg)"; exit 1; fi
