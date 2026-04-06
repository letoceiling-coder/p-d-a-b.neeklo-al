#!/usr/bin/env bash
set -euo pipefail
echo eyJlbWFpbCI6ImRzYy0yM0B5YW5kZXgucnUiLCJwYXNzd29yZCI6IjEyMzEyMzEyMyJ9 | base64 -d > /tmp/pdab-login.json
TOKEN=$(curl -sS --max-time 30 -X POST http://127.0.0.1:3000/auth/login \
  -H "Content-Type: application/json" -d @/tmp/pdab-login.json \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
UP=$(curl -sS --max-time 120 -X POST http://127.0.0.1:3000/documents/upload \
  -H "Authorization: Bearer $TOKEN" -F "file=@/tmp/test-rule.docx")
echo "UPLOAD: $UP"
DOC_ID=$(echo "$UP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "DOC_ID=$DOC_ID"
sleep 8
echo "=== RESULT ==="
curl -sS --max-time 60 "http://127.0.0.1:3000/documents/${DOC_ID}/result" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo "=== RULE HIT (pm2) ==="
pm2 logs pdab-api --lines 400 --nostream 2>/dev/null | grep "RULE HIT" || true
echo "=== FIELD inn (should be empty if rule skipped LLM) ==="
pm2 logs pdab-api --lines 400 --nostream 2>/dev/null | grep "FIELD: inn" || true
