#!/bin/bash
set -e

PROJECT_ID="${GCP_PROJECT_ID:-sunday-natural}"
REGION="europe-west3"
SERVICE_NAME="magnesium-advisor"
CDN_BUCKET="${CDN_BUCKET:-sunday-advisor-cdn}"

echo "Building widget..."
pnpm embed:build
echo "widget.js built at dist/widget.js ($(du -sh dist/widget.js | cut -f1))"

echo "Uploading widget to CDN..."
gsutil -h "Cache-Control:public, max-age=3600" \
       -h "Content-Type:application/javascript" \
       cp dist/widget.js "gs://${CDN_BUCKET}/widget.js"
echo "Widget live at: https://advisor-cdn.sundaynatural.com/widget.js"

echo "Deploying backend to Cloud Run (${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --min-instances 1 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60s \
  --port 3001

echo "Done. Backend URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format "value(status.url)"
