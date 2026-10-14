import test from 'node:test';
import assert from 'node:assert/strict';
import { deslocamentoMinutos, localParaUtc, rfc3339, lerDataHora, lerData, fmtFaixa, buracos, somarDias, fmtDataSolta, hojeNoFuso } from './tempo.mjs';

test('Manaus é UTC-4 o ano inteiro', () => {
  assert.equal(deslocamentoMinutos('America/Manaus', Date.UTC(2026, 0, 15, 12)), -240);
  assert.equal(deslocamentoMinutos('America/Manaus', Date.UTC(2026, 6, 15, 12)), -240);
});

test('hora local de Manaus vira UTC certo e volta em RFC3339', () => {
  const ms = localParaUtc('America/Manaus', lerDataHora('2026-10-16T15:00'));
  assert.equal(new Date(ms).toISOString(), '2026-10-16T19:00:00.000Z');
  assert.equal(rfc3339('America/Manaus', ms), '2026-10-16T15:00:00-04:00');
});

test('fuso com horário de verão: Roma antes e depois da mudança de 29/03/2026', () => {
  const antes = localParaUtc('Europe/Rome', lerDataHora('2026-03-28T10:00'));
  const depois = localParaUtc('Europe/Rome', lerDataHora('2026-03-30T10:00'));
  assert.equal(rfc3339('Europe/Rome', antes), '2026-03-28T10:00:00+01:00');
  assert.equal(rfc3339('Europe/Rome', depois), '2026-03-30T10:00:00+02:00');
});

test('datas inválidas são recusadas', () => {
  assert.throws(() => lerData('2026-02-30'), /DATA_INVALIDA/);
  assert.throws(() => lerDataHora('2026-10-16T25:00'), /DATA_HORA_INVALIDA/);
  assert.throws(() => lerDataHora('16/10/2026 15:00'), /DATA_HORA_INVALIDA/);
});

test('faixa formatada em português, mesmo dia e dias diferentes', () => {
  const z = 'America/Manaus';
  const a = localParaUtc(z, lerDataHora('2026-10-16T15:00')), b = localParaUtc(z, lerDataHora('2026-10-16T16:30'));
  assert.equal(fmtFaixa(z, a, b), 'sex 16/10, 15h–16h30');
  const c = localParaUtc(z, lerDataHora('2026-10-17T02:00'));
  assert.equal(fmtFaixa(z, a, c), 'sex 16/10, 15h – sáb 17/10, 2h');
});

test('buracos entre ocupados respeitam a duração mínima', () => {
  const h = (n) => n * 3600000;
  const livres = buracos(h(8), h(18), [{ inicio: h(9), fim: h(10) }, { inicio: h(12), fim: h(14) }, { inicio: h(13), fim: h(15) }], h(1));
  assert.deepEqual(livres, [{ inicio: h(8), fim: h(9) }, { inicio: h(10), fim: h(12) }, { inicio: h(15), fim: h(18) }]);
  assert.deepEqual(buracos(h(8), h(18), [{ inicio: h(8), fim: h(18) }], h(1)), []);
});

test('dia inteiro: fim exclusivo é o dia seguinte; virada de mês e de ano', () => {
  assert.deepEqual(somarDias(lerData('2026-10-31'), 1), { ano: 2026, mes: 11, dia: 1 });
  assert.deepEqual(somarDias(lerData('2026-12-31'), 1), { ano: 2027, mes: 1, dia: 1 });
  assert.equal(fmtDataSolta('2026-10-16'), 'sex 16/10');
});

test('hoje no fuso: 03:00 UTC ainda é o dia anterior em Manaus', () => {
  assert.deepEqual(hojeNoFuso('America/Manaus', Date.UTC(2026, 9, 14, 3, 0)), { ano: 2026, mes: 10, dia: 13 });
});
