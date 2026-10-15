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
# Skill de passagens (fase 4): caminho curto pelo Google Voos e regras de reporte.
mkdir -p runtime/hermes/skills/viagem/passagens
cp hermes/skills/viagem/passagens/SKILL.md runtime/hermes/skills/viagem/passagens/SKILL.md
chown -R 10000:10000 runtime/hermes/skills/viagem
# Plugin de navegador em nuvem (Browser Use pela Nous com nome de sessão curto). Opt-in em plugins.enabled.
mkdir -p runtime/hermes/plugins/atlas-nuvem
cp hermes/plugins/atlas-nuvem/plugin.yaml hermes/plugins/atlas-nuvem/__init__.py runtime/hermes/plugins/atlas-nuvem/
chown -R 10000:10000 runtime/hermes/plugins/atlas-nuvem

# Servidor MCP de mapas (fase 3): código no repositório, dependências instaladas no volume.
mkdir -p runtime/hermes/mcp/mapas
cp hermes/mcp/mapas/*.mjs hermes/mcp/mapas/package.json hermes/mcp/mapas/package-lock.json runtime/hermes/mcp/mapas/
(cd runtime/hermes/mcp/mapas && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
# Servidor MCP da agenda (fase 1): Google Calendar do Bruno; lê /opt/data/google_token.json.
mkdir -p runtime/hermes/mcp/agenda
cp hermes/mcp/agenda/*.mjs hermes/mcp/agenda/package.json hermes/mcp/agenda/package-lock.json runtime/hermes/mcp/agenda/
(cd runtime/hermes/mcp/agenda && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
# Servidor MCP de e-mail (fase 2): Gmail e Contatos do Bruno; mesmo token do Google.
mkdir -p runtime/hermes/mcp/email
cp hermes/mcp/email/*.mjs hermes/mcp/email/package.json hermes/mcp/email/package-lock.json runtime/hermes/mcp/email/
(cd runtime/hermes/mcp/email && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
# Fase 5 (14/10): Dropbox do Bruno, só leitura (hermes/mcp/arquivos). App key/secret em runtime/hermes/dropbox_app.json (600, uid 10000).
mkdir -p runtime/hermes/mcp/arquivos
cp hermes/mcp/arquivos/*.mjs hermes/mcp/arquivos/package.json hermes/mcp/arquivos/package-lock.json runtime/hermes/mcp/arquivos/
(cd runtime/hermes/mcp/arquivos && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
# Fase 7 (15/10): provedor de voz pela Soniox (hermes/mcp/voz), chamado pelo Hermes como tts.providers.soniox; sem dependências.
mkdir -p runtime/hermes/mcp/voz
cp hermes/mcp/voz/*.mjs hermes/mcp/voz/*.py runtime/hermes/mcp/voz/
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
