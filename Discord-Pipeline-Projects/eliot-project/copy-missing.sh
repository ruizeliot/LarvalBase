#!/bin/bash
cd /var/www/eliot

# Find images in clean source that don't exist in output
find "images-clean/Final image database/" -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.JPG' -o -name '*.JPEG' -o -name '*.PNG' \) | while IFS= read -r src; do
  rel="${src#images-clean/Final image database/}"
  dst="images/$rel"
  if [ ! -f "$dst" ]; then
    dstdir=$(dirname "$dst")
    mkdir -p "$dstdir"
    cp "$src" "$dst"
    echo "Copied: $rel"
  fi
done

echo ""
echo "Total images now:"
find images/ -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.JPG' -o -name '*.JPEG' -o -name '*.PNG' \) | wc -l
