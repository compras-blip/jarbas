"""Provedor de navegador em nuvem do Atlas.

É o mesmo Browser Use pelo gateway da Nous do plugin embutido ``browser-use``, com duas diferenças:

1. Nome de sessão curto. O Hermes 0.21.6 monta ``hermes_<uuid da tarefa>_<hex>`` (52 caracteres) e o
   agent-browser recusa o caminho do socket que resulta disso (148 bytes, limite 103):
   https://github.com/NousResearch/hermes-agent/issues/122786 e /131144. Aqui o nome tem 15.
2. Modo gerenciado (Nous) forçado. O plugin embutido só usa a Nous quando ``browser.cloud_provider``
   é ``nous``; como a seleção aponta para este plugin, resolvemos o gateway diretamente.

Tudo o mais (criar sessão, CDP, encerrar, limpeza de emergência) é herdado sem mudança.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from plugins.browser.browser_use.provider import BrowserUseBrowserProvider


class AtlasNuvemProvider(BrowserUseBrowserProvider):
    provider_id = "atlas-nuvem"
    label = "Atlas nuvem (Browser Use pela Nous)"
    setup_tag = None  # fora do assistente de configuração; seleção só por browser.cloud_provider

    @staticmethod
    def _session_name(task_id: str) -> str:
        # "an_" + 12 hex = 15 caracteres; o caminho do socket fica em ~70 bytes.
        return f"an_{uuid.uuid4().hex[:12]}"

    def _get_config_or_none(self, *, refresh_token: bool = True) -> Optional[Dict[str, Any]]:
        from tools.managed_tool_gateway import peek_nous_access_token, resolve_managed_tool_gateway

        managed = resolve_managed_tool_gateway(
            "browser-use", token_reader=None if refresh_token else peek_nous_access_token)
        if managed is None:
            return None
        return {
            "api_key": managed.nous_user_token,
            "base_url": managed.gateway_origin.rstrip("/"),
            "managed_mode": True,
        }


def register(ctx) -> None:
    ctx.register_browser_provider(AtlasNuvemProvider())
