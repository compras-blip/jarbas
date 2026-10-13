// ics.mjs — leitor de .ics (iCalendar, RFC 5545) para a migração do Calendário da Apple ao Google.
// Só o que a migração precisa: VEVENT com UID, DTSTART/DTEND/DURATION (com TZID ou VALUE=DATE),
// RRULE, EXDATE, RDATE, RECURRENCE-ID, SUMMARY, LOCATION, DESCRIPTION, URL, STATUS, ATTENDEE, VALARM.
// Sem dependências. Linhas dobradas (RFC 5545 §3.1) são desdobradas antes de ler.

export function desdobrar(texto) {
  return String(texto).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

// "DTSTART;TZID=America/Manaus:20261016T070000" -> { nome, params: {TZID}, valor }
export function lerLinha(linha) {
  const i = linha.indexOf(':');
  if (i < 0) return null;
  const cabeca = linha.slice(0, i);
  const valor = linha.slice(i + 1);
  const [nome, ...ps] = cabeca.split(';');
  const params = {};
  for (const p of ps) {
    const j = p.indexOf('=');
    if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, '');
  }
  return { nome: nome.toUpperCase(), params, valor };
}

export const destexto = (s) => String(s ?? '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');

// Um VEVENT bruto -> objeto. Mantém os valores de data como texto + TZID; a conversão é do importador.
function lerEvento(linhas) {
  const ev = { exdates: [], rdates: [], alarmes: [], convidados: [], categorias: [] };
  let alarme = null;
  for (const l of linhas) {
    const p = lerLinha(l);
    if (!p) continue;
    if (p.nome === 'BEGIN' && p.valor === 'VALARM') { alarme = {}; continue; }
    if (p.nome === 'END' && p.valor === 'VALARM') { if (alarme) ev.alarmes.push(alarme); alarme = null; continue; }
    if (alarme) {
      if (p.nome === 'TRIGGER') alarme.trigger = p.valor;
      if (p.nome === 'TRIGGER' && p.params.VALUE === 'DATE-TIME') alarme.absoluto = true;
      if (p.nome === 'ACTION') alarme.acao = p.valor;
      continue;
    }
    switch (p.nome) {
      case 'UID': ev.uid = p.valor; break;
      case 'SUMMARY': ev.titulo = destexto(p.valor); break;
      case 'LOCATION': ev.local = destexto(p.valor); break;
      case 'DESCRIPTION': ev.descricao = destexto(p.valor); break;
      case 'URL': ev.url = p.valor; break;
      case 'STATUS': ev.status = p.valor.toUpperCase(); break;
      case 'TRANSP': ev.transp = p.valor.toUpperCase(); break;
      case 'CLASS': ev.classe = p.valor.toUpperCase(); break;
      case 'SEQUENCE': ev.sequencia = Number(p.valor) || 0; break;
      case 'CREATED': ev.criado = p.valor; break;
      case 'LAST-MODIFIED': ev.modificado = p.valor; break;
      case 'DTSTART': ev.inicio = { valor: p.valor, tzid: p.params.TZID, data: p.params.VALUE === 'DATE' }; break;
      case 'DTEND': ev.fim = { valor: p.valor, tzid: p.params.TZID, data: p.params.VALUE === 'DATE' }; break;
      case 'DURATION': ev.duracao = p.valor; break;
      case 'RRULE': ev.rrule = p.valor; break;
      case 'EXDATE': for (const v of p.valor.split(',')) ev.exdates.push({ valor: v, tzid: p.params.TZID, data: p.params.VALUE === 'DATE' }); break;
      case 'RDATE': for (const v of p.valor.split(',')) ev.rdates.push({ valor: v, tzid: p.params.TZID, data: p.params.VALUE === 'DATE' }); break;
      case 'RECURRENCE-ID': ev.recurrenceId = { valor: p.valor, tzid: p.params.TZID, data: p.params.VALUE === 'DATE' }; break;
      case 'ATTENDEE': { const m = /^mailto:(.+)$/i.exec(p.valor); if (m) ev.convidados.push({ email: m[1], nome: p.params.CN, status: p.params.PARTSTAT }); break; }
      case 'CATEGORIES': ev.categorias.push(...p.valor.split(',').map(destexto)); break;
      case 'X-APPLE-STRUCTURED-LOCATION': ev.localEstruturado = p.valor; break;
      default: break;
    }
  }
  return ev;
}

// Arquivo .ics -> { nome (X-WR-CALNAME), fuso (X-WR-TIMEZONE), eventos[] }
export function lerIcs(texto) {
  const linhas = desdobrar(texto);
  const cal = { nome: '', fuso: '', eventos: [] };
  let dentro = null;
  for (const l of linhas) {
    if (l === 'BEGIN:VEVENT') { dentro = []; continue; }
    if (l === 'END:VEVENT') { if (dentro) cal.eventos.push(lerEvento(dentro)); dentro = null; continue; }
    if (dentro) { dentro.push(l); continue; }
    const p = lerLinha(l);
    if (!p) continue;
    if (p.nome === 'X-WR-CALNAME') cal.nome = destexto(p.valor).trim();
    if (p.nome === 'X-WR-TIMEZONE') cal.fuso = p.valor.trim();
  }
  return cal;
}

// "-PT1H" / "-PT30M" / "-P1D" / "PT0S" -> minutos antes (número >= 0) ou null quando é depois/absoluto.
export function minutosDoTrigger(trigger) {
  const m = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(trigger ?? '').trim());
  if (!m) return null;
  const total = (Number(m[2] || 0) * 7 * 1440) + (Number(m[3] || 0) * 1440) + (Number(m[4] || 0) * 60) + Number(m[5] || 0) + Math.round(Number(m[6] || 0) / 60);
  if (!m[1]) return total === 0 ? 0 : null; // positivo = depois do início: o Google não aceita
  return total;
}

// "20261016T070000" (+ tzid) / "20261016T110000Z" / "20261016" -> { dateTime, timeZone } ou { date }
export function dataGoogle(d, fusoPadrao = 'America/Manaus') {
  if (!d) return null;
  if (d.data || /^\d{8}$/.test(d.valor)) return { date: `${d.valor.slice(0, 4)}-${d.valor.slice(4, 6)}-${d.valor.slice(6, 8)}` };
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(d.valor);
  if (!m) throw new Error(`data iCalendar inválida: ${d.valor}`);
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}`;
  if (m[7]) return { dateTime: iso + 'Z' };
  return { dateTime: iso, timeZone: d.tzid || fusoPadrao };
}

// "P1D", "PT1H30M" -> ms
export function msDaDuracao(dur) {
  const m = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(dur ?? '').trim());
  if (!m) return null;
  return (m[1] ? -1 : 1) * ((Number(m[2] || 0) * 7 * 86400 + Number(m[3] || 0) * 86400 + Number(m[4] || 0) * 3600 + Number(m[5] || 0) * 60 + Number(m[6] || 0)) * 1000);
}

// Linhas de recorrência no formato do Google (lista de strings RRULE/EXDATE/RDATE).
export function recorrenciaGoogle(ev) {
  const out = [];
  if (ev.rrule) out.push(`RRULE:${ev.rrule}`);
  const agrupa = (lista, nome) => {
    const porParam = new Map();
    for (const d of lista) {
      const chave = d.data || /^\d{8}$/.test(d.valor) ? 'VALUE=DATE' : (d.tzid ? `TZID=${d.tzid}` : '');
      if (!porParam.has(chave)) porParam.set(chave, []);
      porParam.get(chave).push(d.valor);
    }
    for (const [chave, vals] of porParam) out.push(`${nome}${chave ? ';' + chave : ''}:${vals.join(',')}`);
  };
  agrupa(ev.exdates, 'EXDATE');
  agrupa(ev.rdates, 'RDATE');
  return out;
}
