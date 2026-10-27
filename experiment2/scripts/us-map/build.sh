#!/bin/sh
# One-time: the US street map for participants' own areas (bramble/area.ts), as one PMTiles
# file in our own Cloud Storage bucket. Phones read it with range requests, so no map provider
# ever sees where a participant is.
#
#   sh scripts/us-map/build.sh <BUILD> <BUCKET>
#   e.g. sh scripts/us-map/build.sh 20261026 privacy-say-do-study-map
#
# BUILD: a recent date from https://maps.protomaps.com/builds (old builds are deleted).
# Needs: the pmtiles CLI (brew install pmtiles) and gcloud, signed in to the project (Blaze plan).
# Zoom 0–14 only: the app zooms in further by scaling zoom-14 tiles, and supermarkets are all in zoom 14.
set -eu
BUILD=$1
BUCKET=$2
PROJECT=privacy-say-do-study
DIR=$(dirname "$0")

echo "1/4 Size check (nothing is downloaded yet):"
pmtiles extract "https://build.protomaps.com/${BUILD}.pmtiles" us.pmtiles --region="$DIR/region.geojson" --maxzoom=14 --dry-run

printf 'Continue with the download? [y/N] '
read -r answer
[ "$answer" = "y" ] || exit 1

echo "2/4 Extracting the US (this takes a while)…"
# Few parallel streams: with many, the build server tends to drop the connection
# ("stream error … INTERNAL_ERROR"). Retried up to 3 times. THREADS=1 sh … to go slower still.
THREADS=${THREADS:-2}
try=1
until pmtiles extract "https://build.protomaps.com/${BUILD}.pmtiles" us.pmtiles --region="$DIR/region.geojson" --maxzoom=14 --download-threads="$THREADS"; do
  if [ "$try" -ge 3 ]; then
    echo "The download failed 3 times. Try again later, with THREADS=1, or with a newer build date."
    exit 1
  fi
  try=$((try + 1))
  echo "Download interrupted; retrying in 30 s (attempt $try of 3)…"
  rm -f us.pmtiles
  sleep 30
done

echo "3/4 Uploading to gs://${BUCKET}…"
gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT" >/dev/null 2>&1 ||
  gcloud storage buckets create "gs://${BUCKET}" --project="$PROJECT" --location=us-central1 --uniform-bucket-level-access
gcloud storage cp us.pmtiles "gs://${BUCKET}/us.pmtiles"

echo "4/4 Letting browsers read it (public map data, range requests)…"
gcloud storage buckets update "gs://${BUCKET}" --cors-file="$DIR/cors.json"
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" --member=allUsers --role=roles/storage.objectViewer

echo
echo "Done. Add this line to experiment2/.env.local, then rebuild and deploy:"
echo "VITE_MAP_ARCHIVE_URL=https://storage.googleapis.com/${BUCKET}/us.pmtiles"
echo "Attribution: Map data © OpenStreetMap contributors (ODbL), via Protomaps build ${BUILD}."
