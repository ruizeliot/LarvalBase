#!/bin/bash
set -e

echo "=== Step 1: Extract ZIP to images-clean ==="
cd /var/www/eliot

# Remove old clean dir if exists
rm -rf images-clean
mkdir -p images-clean

echo "Extracting ZIP..."
unzip -q final-image-database.zip -d images-clean/
echo "Done extracting."

# The ZIP extracts to images-clean/Final image database/
# List contents
echo "Contents of images-clean:"
ls images-clean/
echo ""
ls "images-clean/Final image database/" 2>/dev/null || echo "(no Final image database subdir)"

echo ""
echo "=== Step 1b: Free disk space - remove old images-original ==="
echo "Disk before cleanup:"
df -h /var/www/eliot/ | tail -1
rm -rf /var/www/eliot/images-original
echo "Removed images-original (replaced by images-clean from ZIP)"
echo "Disk after cleanup:"
df -h /var/www/eliot/ | tail -1

echo ""
echo "=== Step 2: Clear existing watermarked images ==="
# Keep metadata files and directory structure, remove image files
echo "Counting existing images..."
find images/ -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.JPG' -o -name '*.JPEG' -o -name '*.PNG' \) | wc -l

echo "Removing existing images (keeping metadata and dirs)..."
find images/ -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.JPG' -o -name '*.JPEG' -o -name '*.PNG' \) -delete
echo "Done clearing."

echo ""
echo "=== Step 3: Run watermark script ==="
echo "Starting watermark-v3.js..."
node watermark-v3.js

echo ""
echo "=== Step 4: Count results ==="
echo "Watermarked images:"
find images/ -type f \( -name '*.jpg' -o -name '*.jpeg' -o -name '*.png' -o -name '*.JPG' -o -name '*.JPEG' -o -name '*.PNG' \) | wc -l

echo ""
echo "=== Step 5: Cleanup ==="
rm -f final-image-database.zip
echo "Removed ZIP file."

echo ""
echo "=== Step 6: Restart app ==="
pm2 restart eliot
echo "Done! App restarted."
