// google.mjs — cliente da Places API (New) do Google. Só o que o Atlas usa:
//   POST /v1/places:searchText  (achar lugares; campos "Pro", 5.000 grátis/mês)
//   GET  /v1/places/{id}        (ficha de 1 lugar; campos "Enterprise" ou "Enterprise + Atmosphere")
// Regras do Google que este arquivo respeita: a conta é pelo campo mais caro pedido (por isso as
// máscaras são separadas), o field mask é obrigatório, sem espaços, e a chave vai no cabeçalho.
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
//       https://developers.google.com/maps/documentation/places/web-service/place-details

export const BASE = 'https://places.googleapis.com/v1';
export const FONTE = 'Google Maps (Places API, consultado agora)';

// Busca: nível Pro (US$ 32/mil, 5.000 grátis/mês). Nunca pedir horário aqui.
export const MASCARA_BUSCA = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location', 'places.businessStatus',
  'places.googleMapsUri', 'places.utcOffsetMinutes', 'places.primaryTypeDisplayName', 'places.types',
].join(',');
// Ponto de referência ("perto do hotel X"): só o essencial.
export const MASCARA_REFERENCIA = 'places.id,places.displayName,places.formattedAddress,places.location';
// Ficha: nível Enterprise (US$ 20/mil, 1.000 grátis/mês).
export const MASCARA_FICHA = [
  'id', 'displayName', 'formattedAddress', 'businessStatus', 'googleMapsUri', 'utcOffsetMinutes', 'timeZone',
  'primaryTypeDisplayName', 'currentOpeningHours', 'regularOpeningHours', 'rating', 'userRatingCount', 'priceLevel',
  'websiteUri', 'internationalPhoneNumber',
].join(',');
// Ficha com avaliações: nível Enterprise + Atmosphere (US$ 25/mil, 1.000 grátis/mês). Só quando pedido.
export const MASCARA_AVALIACOES = MASCARA_FICHA + ',reviews,reviewSummary';

export class ErroGoogle extends Error {
  constructor(code, transitorio = false) { super(code); this.code = code; this.transitorio = transitorio; }
}

// Estado do processo: limite diário e cache de 5 minutos. Zerado em testes.
const estado = { dia: '', chamadas: 0, cache: new Map() };
export const chamadasHoje = () => estado.chamadas;
export const zerarEstado = () => { estado.dia = ''; estado.chamadas = 0; estado.cache.clear(); };

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export async function chamar({ chave, metodo = 'POST', caminho, corpo, mascara, fetchImpl = fetch, timeoutMs = 8000, tentativas = 2, esperar = dormir, agora = Date.now, limiteDiario = 300, cacheMs = 5 * 60 * 1000 }) {
  if (!chave) throw new ErroGoogle('GOOGLE_SEM_CHAVE');
  const t = agora();
  const k = `${metodo} ${caminho}\n${mascara}\n${corpo ? JSON.stringify(corpo) : ''}`;
  const guardado = estado.cache.get(k);
  if (guardado && t - guardado.at < cacheMs) return guardado.resposta;
  const dia = new Date(t).toISOString().slice(0, 10);
  if (estado.dia !== dia) { estado.dia = dia; estado.chamadas = 0; }
  if (estado.chamadas >= limiteDiario) throw new ErroGoogle('GOOGLE_LIMITE_DIARIO');
  let ultimo = 'GOOGLE_FALHOU';
  for (let i = 1; i <= tentativas; i++) {
    estado.chamadas += 1;
    try {
      const r = await fetchImpl(BASE + caminho, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': mascara },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        if (j && typeof j === 'object') {
          if (estado.cache.size >= 200) estado.cache.delete(estado.cache.keys().next().value);
          estado.cache.set(k, { at: t, resposta: j });
          return j;
        }
        ultimo = 'GOOGLE_RESPOSTA_INVALIDA';
      } else if (r.status >= 500 || r.status === 429 || r.status === 408) {
        ultimo = `GOOGLE_HTTP_${r.status}`; // passageiro: tenta de novo
      } else {
        throw new ErroGoogle(`GOOGLE_HTTP_${r.status}`); // chave, faturamento, pedido errado, não existe: não adianta repetir
      }
    } catch (e) {
      if (e instanceof ErroGoogle) throw e;
      ultimo = e?.name === 'TimeoutError' ? 'GOOGLE_TEMPO_ESGOTADO' : 'GOOGLE_REDE';
    }
    if (i < tentativas) await esperar(600);
  }
  throw new ErroGoogle(ultimo, true);
}

// Lugares por texto. `locationBias` = { latitude, longitude, raioMetros } (preferência, não restrição).
export async function buscarTexto({ chave, texto, locationBias = null, abertoAgora = false, quantos = 5, notaMinima = null, languageCode = 'pt-BR', regionCode = null, mascara = MASCARA_BUSCA, ...resto }) {
  const corpo = { textQuery: String(texto), languageCode, pageSize: Math.max(1, Math.min(20, Number(quantos) || 5)) };
  if (locationBias) corpo.locationBias = { circle: { center: { latitude: locationBias.latitude, longitude: locationBias.longitude }, radius: Math.max(1, Math.min(50000, locationBias.raioMetros ?? 3000)) } };
  if (abertoAgora) corpo.openNow = true;
  if (notaMinima !== null && notaMinima !== undefined) corpo.minRating = Math.round(Number(notaMinima) * 2) / 2;
  if (regionCode) corpo.regionCode = regionCode;
  const j = await chamar({ chave, metodo: 'POST', caminho: '/places:searchText', corpo, mascara, ...resto });
  return Array.isArray(j.places) ? j.places : [];
}

// Ponto de referência: o primeiro lugar que o Google acha para "perto de X".
export async function referencia({ chave, pertoDe, languageCode = 'pt-BR', ...resto }) {
  const places = await buscarTexto({ chave, texto: pertoDe, quantos: 1, languageCode, mascara: MASCARA_REFERENCIA, ...resto });
  const p = places[0];
  if (!p?.location) return null;
  return { nome: p.displayName?.text ?? '', endereco: p.formattedAddress ?? '', latitude: p.location.latitude, longitude: p.location.longitude };
}

// Ficha de um lugar pelo id. Com avaliações só quando pedido (custa mais).
export async function ficha({ chave, placeId, comAvaliacoes = false, languageCode = 'pt-BR', ...resto }) {
  const id = String(placeId ?? '').replace(/^places\//, '');
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new ErroGoogle('GOOGLE_ID_INVALIDO');
  const mascara = comAvaliacoes ? MASCARA_AVALIACOES : MASCARA_FICHA;
  return chamar({ chave, metodo: 'GET', caminho: `/places/${id}?languageCode=${encodeURIComponent(languageCode)}`, mascara, ...resto });
}
