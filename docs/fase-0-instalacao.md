# Fase 0: Jarbas no ar pelo Telegram

**Objetivo:** conversar com o Jarbas pelo celular, inclusive por áudio, com o modelo da Nous Portal e a memória do Hindsight funcionando.

**Pronto quando:** você manda "oi" no Telegram e ele responde; conta algo sobre você, abre uma conversa nova (`/new`) e ele lembra.

Tudo roda em Docker no seu VPS, separado do OpenClaw. Nenhuma porta é aberta para a internet.

---

## Antes de começar (no celular ou no computador)

1. **Bot do Telegram:** no Telegram, fale com o **@BotFather**, mande `/newbot`, escolha nome e usuário e copie o **token**.
2. **Seu ID do Telegram:** fale com o **@userinfobot** e copie o número (não é o @usuario).
3. **Conta na Nous Portal:** crie em https://portal.nousresearch.com e assine o plano. Gere também uma **chave de API** lá, que vai para o Hindsight. *(Se o painel não oferecer chave de API, me avise que trocamos o Hindsight para outro provedor.)*

## 1. No VPS: preparar

Entre no VPS por SSH e confira se o Docker está instalado:

```bash
docker --version && docker compose version
```

Se algum dos dois não existir, me avise antes de instalar, porque o OpenClaw já roda nesse servidor.

Baixe o repositório:

```bash
cd ~
git clone https://github.com/compras-blip/jarbas.git
cd jarbas
```

*(O repositório é privado: o GitHub vai pedir login. Use um token de acesso pessoal como senha.)*

## 2. Preencher os segredos

```bash
cp .env.hermes.example .env.hermes
cp .env.hindsight.example .env.hindsight
nano .env.hermes      # token do bot e seu ID do Telegram
nano .env.hindsight   # chave de API da Nous e uma senha para a interface
```

## 3. Subir a memória e preparar o Hermes

```bash
./scripts/deploy.sh
```

Na primeira vez o Hermes ainda não tem login na Nous Portal, então ele pode reiniciar em loop. É esperado. Siga para o passo 4.

## 4. Login na Nous Portal e plugin do Hindsight

```bash
# Login na Nous Portal (código de dispositivo: abra o link que aparecer no navegador do celular e aprove)
docker compose run --rm hermes auth add nous

# Instala o plugin de memória
docker compose run --rm hermes plugins install hindsight

# Confere se a memória está ativa
docker compose run --rm hermes memory status

# Diagnóstico geral
docker compose run --rm hermes doctor
```

## 5. Ligar de vez

```bash
docker compose restart hermes
docker compose logs -f hermes     # Ctrl+C para sair dos logs
```

Mande "oi" para o seu bot no Telegram.

## 6. Fixar a versão

Quando tudo estiver funcionando, descubra a versão e fixe para nenhuma atualização quebrar o Jarbas sem querer:

```bash
docker compose run --rm hermes --version
```

Crie um arquivo `.env` na raiz do repositório com `HERMES_VERSION=<versão>` (por exemplo, `HERMES_VERSION=0.21.5`) e rode `./scripts/deploy.sh` de novo. Atualizar passa a ser uma decisão: mudar esse número, rodar os testes e só então manter.

## 7. Testar

Rode os cenários de [evals/fase-0.md](../evals/fase-0.md) e anote o resultado.

## Ver a memória do Jarbas

A interface do Hindsight escuta só dentro do servidor. Do seu computador:

```bash
ssh -L 9999:127.0.0.1:9999 usuario@ip-do-vps
```

Depois abra http://localhost:9999 no navegador e use a senha do `.env.hindsight`.

## Se algo der errado

- `docker compose logs hermes --tail 100` e `docker compose logs hindsight --tail 100`: me mande a saída aqui.
- Para parar tudo sem perder nada: `docker compose down`. A memória fica no volume `hindsight-data`, e as sessões e o login ficam em `runtime/hermes`.
