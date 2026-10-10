import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarHorario, veredito, textoDoDia, lerHora, hhmm, diaDaSemana, agoraNoLugar, conferirNome, ordinalDaData } from './horario.mjs';

const pt = (day, hour, minute = 0) => ({ day, hour, minute });
// semana típica: seg a sex 12h–15h e 19h–23h; sábado 22h–2h (vira o dia); domingo fechado
const regular = { periods: [
  ...[1, 2, 3, 4, 5].flatMap((d) => [{ open: pt(d, 12), close: pt(d, 15) }, { open: pt(d, 19), close: pt(d, 23) }]),
  { open: pt(6, 22), close: pt(0, 2) },
] };
const lugar = { utcOffsetMinutes: -240, regularOpeningHours: regular };
const agoraMs = Date.UTC(2026, 9, 12, 16, 0); // 12/10/2026 12:00 em Manaus (UTC-4), segunda-feira

test('datas e horas', () => {
  assert.equal(diaDaSemana('2026-10-12'), 1);
  assert.equal(diaDaSemana('2026-10-11'), 0);
  assert.equal(lerHora('19:45'), 1185);
  assert.equal(lerHora('19h45'), 1185);
  assert.equal(lerHora('19h'), 1140);
  assert.equal(lerHora('9:05'), 545);
  assert.throws(() => lerHora('25h'));
  assert.throws(() => ordinalDaData('2026-02-30'));
  assert.equal(hhmm(1185), '19h45');
  assert.equal(hhmm(1140), '19h');
  assert.deepEqual(agoraNoLugar(agoraMs, -240), { data: '2026-10-12', minutos: 720, ordinal: ordinalDaData('2026-10-12') });
});

test('semana regular: segunda', () => {
  const h = avaliarHorario(lugar, { data: '2026-10-12', minutos: lerHora('12:30'), agoraMs });
  assert.equal(h.origem, 'regular');
  assert.equal(h.aberto, true);
  assert.equal(textoDoDia(h), '12h às 15h e 19h às 23h');
  assert.equal(veredito(h, { minutos: lerHora('12:30'), dia: 1, agora: true }), 'ABERTO agora (12h30), fecha às 15h');
  const h2 = avaliarHorario(lugar, { data: '2026-10-12', minutos: lerHora('16:00'), agoraMs });
  assert.equal(veredito(h2, { minutos: lerHora('16:00'), dia: 1 }), 'FECHADO às 16h: só abre às 19h (19h às 23h)');
  const h3 = avaliarHorario(lugar, { data: '2026-10-12', minutos: lerHora('23:30'), agoraMs });
  assert.equal(veredito(h3, { minutos: lerHora('23:30'), dia: 1 }), 'FECHADO às 23h30: fechou às 23h (segunda-feira: 12h às 15h e 19h às 23h)');
  const h4 = avaliarHorario(lugar, { data: '2026-10-12', minutos: lerHora('14:30'), agoraMs });
  assert.equal(veredito(h4, { minutos: lerHora('14:30'), dia: 1 }), 'ABERTO às 14h30, fecha às 15h — ATENÇÃO: fecha em 30 min');
});

test('semana regular: domingo fechado e sabado que vira a noite', () => {
  const dom = avaliarHorario(lugar, { data: '2026-10-18', minutos: lerHora('20:00'), agoraMs });
  assert.equal(veredito(dom, { minutos: lerHora('20:00'), dia: 0 }), 'FECHADO às 20h: não abre neste domingo');
  const sab = avaliarHorario(lugar, { data: '2026-10-17', minutos: null, agoraMs });
  assert.equal(textoDoDia(sab), '22h às 2h da madrugada seguinte');
  // domingo 1h da manhã: ainda dentro do período de sábado
  const madrugada = avaliarHorario(lugar, { data: '2026-10-18', minutos: lerHora('01:00'), agoraMs });
  assert.equal(madrugada.aberto, true);
  assert.equal(veredito(madrugada, { minutos: 60, dia: 0 }), 'ABERTO às 1h, fecha às 2h');
});

test('24 horas e sem horario', () => {
  const sempre = { utcOffsetMinutes: 0, regularOpeningHours: { periods: [{ open: pt(0, 0) }] } };
  const h = avaliarHorario(sempre, { data: '2026-10-12', minutos: 300, agoraMs });
  assert.equal(h.vinteQuatro, true);
  assert.equal(veredito(h, { minutos: 300, dia: 1 }), 'ABERTO às 5h (24 horas)');
  assert.equal(avaliarHorario({ utcOffsetMinutes: 0 }, { data: '2026-10-12', minutos: 300, agoraMs }), null);
  assert.equal(veredito(null, { minutos: 300, dia: 1 }), null);
});

test('proximos 7 dias com feriado tem prioridade sobre o regular', () => {
  const d = (day) => ({ year: 2026, month: 10, day });
  const atual = { periods: [
    { open: { ...pt(1, 12), date: d(12) }, close: { ...pt(1, 15), date: d(12) } },
    { open: { ...pt(1, 19), date: d(12) }, close: { ...pt(1, 23), date: d(12) } },
    // terça 13/10: feriado, só à noite
    { open: { ...pt(2, 19), date: d(13) }, close: { ...pt(2, 23), date: d(13) } },
    // quarta 14/10: normal
    { open: { ...pt(3, 12), date: d(14) }, close: { ...pt(3, 15), date: d(14) } },
    { open: { ...pt(3, 19), date: d(14) }, close: { ...pt(3, 23), date: d(14) } },
  ] };
  const l = { utcOffsetMinutes: -240, regularOpeningHours: regular, currentOpeningHours: atual };
  const ter = avaliarHorario(l, { data: '2026-10-13', minutos: lerHora('12:30'), agoraMs });
  assert.equal(ter.origem, 'proximos7dias');
  assert.equal(veredito(ter, { minutos: lerHora('12:30'), dia: 2 }), 'FECHADO às 12h30: só abre às 19h (19h às 23h)');
  // 10 dias à frente: fora da janela, volta ao regular
  const longe = avaliarHorario(l, { data: '2026-10-22', minutos: lerHora('12:30'), agoraMs });
  assert.equal(longe.origem, 'regular');
  assert.equal(longe.aberto, true);
});

test('conferencia de nome', () => {
  assert.equal(conferirNome('Bem Brasil Milão', 'Bem Brasil Ristorante').ok, true);
  assert.equal(conferirNome('Ristorante Imperialino', 'Il Boccone del Prete').ok, false);
  assert.equal(conferirNome('Bodytech Ponta Negra', 'Bodytech - Ponta Negra').ok, true);
  assert.equal(conferirNome('Parque Ibirapuera', 'Parque Ibirapuera').ok, true);
  assert.equal(conferirNome('Parque Ibirapuera, São Paulo', 'Parque Ibirapuera', 'Av. Pedro Álvares Cabral - Vila Mariana, São Paulo - SP').ok, true);
  assert.equal(conferirNome('Bodytech Ponta Negra, Manaus', 'Bodytech Shopping Ponta Negra', 'Av. Coronel Teixeira, Manaus').ok, true);
  assert.equal(conferirNome('Bem Brasil Milão', 'Il Boccone del Prete', 'Milano').ok, false);
});
