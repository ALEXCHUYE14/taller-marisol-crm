#!/usr/bin/env bash
# Empaqueta el proyecto en un .zip limpio (sin node_modules, .next ni credenciales)
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME="taller-marisol-crm"
rm -f "${NAME}.zip"
zip -rq "${NAME}.zip" "${NAME}" \
  -x "${NAME}/node_modules/*" "${NAME}/.next/*" "${NAME}/.env" "${NAME}/.env.local" \
     "${NAME}/*.tsbuildinfo" "${NAME}/next-env.d.ts" "${NAME}/.git/*"
echo "Paquete creado: $(pwd)/${NAME}.zip"
