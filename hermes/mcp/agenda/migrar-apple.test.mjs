import test from 'node:test';
import assert from 'node:assert/strict';
import { montarEvento, preparar, exdatesParaMestre } from './migrar-apple.mjs';

test('evento com hora: Recife 16:30 vira Manaus 15:30 com fuso', () => {
  const { corpo } = montarEvento({ uid: 'U1', titulo: 'Reunião', inicio: '2026-10-16T16:30:00', fim: '2026-10-16T17:30:00', dia_inteiro: 'false', local: 'Sala 2', descricao: 'pauta\nitem', url: 'https://x', status: 'confirmed', recorrencia: '', exdates: '', sequencia: '1' }, 'America/Recife');
  assert.deepEqual(corpo.start, { dateTime: '2026-10-16T15:30:00', timeZone: 'America/Manaus' });
  assert.deepEqual(corpo.end, { dateTime: '2026-10-16T16:30:00', timeZone: 'America/Manaus' });
  assert.equal(corpo.description, 'pauta\nitem\nLink: https://x');
  assert.equal(corpo.location, 'Sala 2');
  assert.deepEqual(corpo.reminders, { useDefault: true });
});

test('dia inteiro: fim exclusivo no dia seguinte', () => {
  const { corpo } = montarEvento({ uid: 'U2', titulo: 'Viagem', inicio: '2026-11-01T00:00:00', fim: '2026-11-03T23:59:59', dia_inteiro: 'true', status: 'confirmed' }, 'America/Recife');
  assert.deepEqual(corpo.start, { date: '2026-11-01' });
  assert.deepEqual(corpo.end, { date: '2026-11-04' });
});

test('recorrência com exdates convertidas para o fuso de destino', () => {
  const { corpo } = montarEvento({ uid: 'U3', titulo: 'Treino', inicio: '2026-10-19T08:00:00', fim: '2026-10-19T09:00:00', dia_inteiro: 'false', status: 'confirmed', recorrencia: 'FREQ=WEEKLY;BYDAY=MO', exdates: '2026-10-26T08:00:00,2026-11-02T08:00:00' }, 'America/Recife');
  assert.deepEqual(corpo.recurrence, ['RRULE:FREQ=WEEKLY;BYDAY=MO', 'EXDATE;TZID=America/Manaus:20261026T070000,20261102T070000']);
});

test('uid repetido vira exceção com sufixo; cancelados saem', () => {
  const regs = [
    { uid: 'A', titulo: 'x', inicio: '2026-10-16T10:00:00', fim: '2026-10-16T11:00:00', dia_inteiro: 'false', status: 'confirmed' },
    { uid: 'A', titulo: 'x remarcado', inicio: '2026-10-17T10:00:00', fim: '2026-10-17T11:00:00', dia_inteiro: 'false', status: 'confirmed' },
    { uid: 'B', titulo: 'cancelado', inicio: '2026-10-18T10:00:00', fim: '2026-10-18T11:00:00', dia_inteiro: 'false', status: 'cancelled' },
  ];
  const p = preparar(regs, 'America/Recife');
  assert.equal(p.eventos.length, 2);
  assert.deepEqual(p.eventos.map((e) => e.corpo.iCalUID), ['A', 'A-exc-1']);
  assert.equal(p.duplicados, 1);
});

test('UNTIL sem Z ganha Z (o Google exige UTC com fuso no início)', () => {
  const { corpo } = montarEvento({ uid: 'J', titulo: 'Jeep', inicio: '2024-04-11T07:30:00', fim: '2024-04-11T08:30:00', dia_inteiro: 'false', status: 'confirmed', recorrencia: 'FREQ=YEARLY;INTERVAL=1;UNTIL=20250412T005959' }, 'America/Recife');
  assert.deepEqual(corpo.recurrence, ['RRULE:FREQ=YEARLY;INTERVAL=1;UNTIL=20250412T005959Z']);
  const ok = montarEvento({ uid: 'K', titulo: 'x', inicio: '2024-04-11T07:30:00', fim: '2024-04-11T08:30:00', dia_inteiro: 'false', status: 'confirmed', recorrencia: 'FREQ=WEEKLY;UNTIL=20250412T005959Z' }, 'America/Recife');
  assert.deepEqual(ok.corpo.recurrence, ['RRULE:FREQ=WEEKLY;UNTIL=20250412T005959Z']);
});

test('EXDATE para ocorrências destacadas usa o dia da destacada e a hora do mestre, no fuso de destino', () => {
  const mestre = { inicio: '2013-10-15T16:00:00', dia_inteiro: 'false', recorrencia: 'FREQ=WEEKLY' };
  const r = exdatesParaMestre(mestre, [{ inicio: '2026-10-13T17:30:00' }, { inicio: '2026-10-20T16:00:00' }], 'America/Recife');
  assert.deepEqual(r, { diaInteiro: false, lista: ['20261013T150000', '20261020T150000'] });
  const d = exdatesParaMestre({ inicio: '2024-01-01T00:00:00', dia_inteiro: 'true', recorrencia: 'FREQ=MONTHLY' }, [{ inicio: '2024-03-01T00:00:00' }], 'America/Recife');
  assert.deepEqual(d, { diaInteiro: true, lista: ['20240301'] });
});
