#!/usr/bin/env bash
# Copia a configuração versionada para o diretório que o contêiner do Hermes lê
# e (re)sobe o Atlas. Rode da raiz do repositório: ./scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

for f in .env.hermes .env.hindsight; do
  if [ ! -f "$f" ]; then
    echo "Falta o arquivo $f. Copie $f.example e preencha." >&2
    exit 1
  fi
  chmod 600 "$f"
done

mkdir -p runtime/hermes/hindsight
cp hermes/SOUL.md runtime/hermes/SOUL.md
cp hermes/config.yaml runtime/hermes/config.yaml
cp hermes/hindsight/config.json runtime/hermes/hindsight/config.json
# A skill embutida hermes-agent (manual para o agente mexer no próprio Hermes) não pode ser
# desligada; trocamos o conteúdo por um aviso. O Hermes preserva skill modificada pelo usuário.
mkdir -p runtime/hermes/skills/autonomous-ai-agents/hermes-agent
cp hermes/skills/hermes-agent/SKILL.md runtime/hermes/skills/autonomous-ai-agents/hermes-agent/SKILL.md

docker compose pull
docker compose up -d
docker compose ps
