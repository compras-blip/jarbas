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
cp hermes/AGENTS.md runtime/hermes/AGENTS.md   # regras de trabalho e doutrina de ferramentas (lido da pasta de trabalho /opt/data)
chown 10000:10000 runtime/hermes/AGENTS.md
cp hermes/config.yaml runtime/hermes/config.yaml
cp hermes/hindsight/config.json runtime/hermes/hindsight/config.json
# A skill embutida hermes-agent (manual para o agente mexer no próprio Hermes) não pode ser
# desligada; trocamos o conteúdo por um aviso. O Hermes preserva skill modificada pelo usuário.
mkdir -p runtime/hermes/skills/autonomous-ai-agents/hermes-agent
cp hermes/skills/hermes-agent/SKILL.md runtime/hermes/skills/autonomous-ai-agents/hermes-agent/SKILL.md
# Skill de uso do WhatsApp (fase 6): as ferramentas do n8n chegam com descrição genérica; a skill é o guia que o modelo lê sob demanda.
mkdir -p runtime/hermes/skills/whatsapp/whatsapp-do-bruno
cp hermes/skills/whatsapp/whatsapp-do-bruno/SKILL.md runtime/hermes/skills/whatsapp/whatsapp-do-bruno/SKILL.md
chown -R 10000:10000 runtime/hermes/skills/whatsapp

# Servidor MCP de mapas (fase 3): código no repositório, dependências instaladas no volume.
mkdir -p runtime/hermes/mcp/mapas
cp hermes/mcp/mapas/*.mjs hermes/mcp/mapas/package.json hermes/mcp/mapas/package-lock.json runtime/hermes/mcp/mapas/
(cd runtime/hermes/mcp/mapas && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
# O gateway roda como uid 10000 dentro do container: o que este script copia como root fica legível, mas o log,
# o cache e a trava do MCP precisam ser dele (10/10: criados como root numa sondagem, o gateway não conseguia escrever).
chown -R 10000:10000 runtime/hermes/mcp
for f in runtime/hermes/logs/mcp-stderr.log runtime/hermes/cache/mcp_schema_cache.json runtime/hermes/.mcp-discovery.lock; do
  [ ! -e "$f" ] || chown 10000:10000 "$f"
done

docker compose pull
docker compose up -d
# O pacote python "mcp" é um extra opcional do Hermes e NÃO vem no ambiente gerenciado do volume
# (/opt/data/installs/.../venv, só extras fal+telegram). Sem ele o gateway ignora mcp_servers em silêncio (achado em 10/10).
# Idempotente; o gateway só enxerga o pacote depois de reiniciar (docker restart atlas-hermes).
docker compose exec -T -u 10000 -e HERMES_HOME=/opt/data hermes hermes pm install --extra mcp </dev/null
# Fase 4: o agent-browser (dirige o Chromium que já vem na imagem) também não vem na imagem (bug #135732). Idempotente.
docker compose exec -T -u 10000 -e HERMES_HOME=/opt/data hermes hermes pm install agent-browser </dev/null
docker compose ps
