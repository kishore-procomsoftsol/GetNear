#!/bin/bash
# ==============================================================================
# Migrate GetNear business images from satya.instawp.co to AWS S3
# Bucket: getnear-assets (ap-south-1)
# Prefix: business-photos/
# ==============================================================================

set -e

BUCKET="getnear-assets"
REGION="ap-south-1"
PREFIX="business-photos"
TEMP_DIR="/tmp/getnear-images"

mkdir -p "$TEMP_DIR"

echo "🚀 Starting image migration to S3..."
echo "   Bucket: $BUCKET"
echo "   Region: $REGION"
echo "   Prefix: $PREFIX/"
echo ""

# Array of all image URLs from the seed data
URLS=(
  "https://satya.instawp.co/wp-content/uploads/2026/06/unnamed-1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/unnamed.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/M-M-Generics1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/M-M-Generics2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/mediplus1.webp"
  "https://satya.instawp.co/wp-content/uploads/2026/06/mediplus2.webp"
  "https://satya.instawp.co/wp-content/uploads/2026/06/gayatri1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/gayatri2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/sfc1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/sfc2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/green2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/green1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/inte1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/inte2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/sa1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/sa2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/glob1.webp"
  "https://satya.instawp.co/wp-content/uploads/2026/06/glob2.webp"
  "https://satya.instawp.co/wp-content/uploads/2026/06/nar1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/nar2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cel1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cel2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/babi2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bab1.avif"
  "https://satya.instawp.co/wp-content/uploads/2026/06/md2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/md1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/varun2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/varun1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/eat2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/eat1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/stop1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/stop2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/aroma1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/aroma2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/templespa1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/templespa2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/vnv1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/vnv2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/natural1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/natural2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/lakme1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/lakme2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/celb1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/celb2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/axatm2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/axatm1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/icicatm2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/icicatm1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/fristcry1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/fristcry2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/san2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/san1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/mon1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/mon2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/kidz1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/kidz2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/euro1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/euro2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/hit2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/hit1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/rj2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/rj1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/mk2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/mk1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bus1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bus2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bus3.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bus4.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t3.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t4.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t5.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t6.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t7.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/t8.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/c1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/c2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/c3.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/c4.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/c5.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/c6.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/m1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/m2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/m3.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/kala1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/kala2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/atoz1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/atoz2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/sri1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/sri2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/dmart1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/dmart2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/vijya1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/vijya2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/khishi1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/khishi2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/metro1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/metro2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/fresh1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/fresh2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric3.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric4.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric5.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric6.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric7.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric8.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric9.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/cric10.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/ariya1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/ariya2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/siva1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/siva2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bhar1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/bhar2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/ved1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/ved2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/neo1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/neo2.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/phc1.jpg"
  "https://satya.instawp.co/wp-content/uploads/2026/06/phc2.jpg"
)

TOTAL=${#URLS[@]}
COUNT=0
FAILED=0

for URL in "${URLS[@]}"; do
  COUNT=$((COUNT + 1))
  FILENAME=$(basename "$URL")
  LOCAL_PATH="$TEMP_DIR/$FILENAME"
  S3_KEY="$PREFIX/$FILENAME"
  
  # Determine content type
  case "$FILENAME" in
    *.jpg) CONTENT_TYPE="image/jpeg" ;;
    *.webp) CONTENT_TYPE="image/webp" ;;
    *.avif) CONTENT_TYPE="image/avif" ;;
    *.png) CONTENT_TYPE="image/png" ;;
    *) CONTENT_TYPE="image/jpeg" ;;
  esac

  echo "[$COUNT/$TOTAL] Downloading $FILENAME..."
  
  if curl -sS -L -o "$LOCAL_PATH" "$URL" 2>/dev/null; then
    # Check file is not empty
    if [ -s "$LOCAL_PATH" ]; then
      echo "         Uploading to s3://$BUCKET/$S3_KEY..."
      aws s3 cp "$LOCAL_PATH" "s3://$BUCKET/$S3_KEY" \
        --content-type "$CONTENT_TYPE" \
        --region "$REGION" \
        --quiet
      echo "         ✅ Done"
    else
      echo "         ⚠️  Empty file, skipping"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "         ❌ Download failed"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "============================================"
echo "✅ Migration complete!"
echo "   Total: $TOTAL images"
echo "   Success: $((TOTAL - FAILED))"
echo "   Failed: $FAILED"
echo ""
echo "   New base URL: https://$BUCKET.s3.$REGION.amazonaws.com/$PREFIX/"
echo "============================================"

# Clean up
rm -rf "$TEMP_DIR"

echo ""
echo "📝 Now update the seed SQL to replace:"
echo "   'https://satya.instawp.co/wp-content/uploads/2026/06/'"
echo "   with:"
echo "   'https://$BUCKET.s3.$REGION.amazonaws.com/$PREFIX/'"
