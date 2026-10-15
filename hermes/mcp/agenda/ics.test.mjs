import test from 'node:test';
import assert from 'node:assert/strict';
import { lerIcs, minutosDoTrigger, dataGoogle, recorrenciaGoogle, msDaDuracao, desdobrar } from './ics.mjs';

const AMOSTRA = `BEGIN:VCALENDAR\r
VERSION:2.0\r
X-WR-CALNAME:medico\r
X-WR-TIMEZONE:America/Manaus\r
BEGIN:VEVENT\r
UID:ABC-123\r
DTSTART;TZID=America/Manaus:20261016T070000\r
DTEND;TZID=America/Manaus:20261016T080000\r
SUMMARY:Consulta Dr. Fulano\\, retorno\r
LOCATION:Rua A\\, 100\r
DESCRIPTION:Levar exames\\nde sangue\r
RRULE:FREQ=WEEKLY;BYDAY=FR;COUNT=4\r
EXDATE;TZID=America/Manaus:20261023T070000\r
STATUS:CONFIRMED\r
BEGIN:VALARM\r
ACTION:DISPLAY\r
TRIGGER:-PT1H\r
END:VALARM\r
BEGIN:VALARM\r
ACTION:AUDIO\r
TRIGGER:-P1D\r
END:VALARM\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:DIA-1\r
DTSTART;VALUE=DATE:20261101\r
DTEND;VALUE=DATE:20261102\r
SUMMARY:Pagar condomínio com uma descrição muito longa que o Apple dobra em várias li\r
 nhas no arquivo exportado\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:ABC-123\r
RECURRENCE-ID;TZID=America/Manaus:20261030T070000\r
DTSTART;TZID=America/Manaus:20261030T090000\r
DTEND;TZID=America/Manaus:20261030T100000\r
SUMMARY:Consulta remarcada\r
END:VEVENT\r
END:VCALENDAR\r
`;

test('lê calendário, eventos, escapes e linhas dobradas', () => {
  const cal = lerIcs(AMOSTRA);
  assert.equal(cal.nome, 'medico');
  assert.equal(cal.fuso, 'America/Manaus');
  assert.equal(cal.eventos.length, 3);
  const e = cal.eventos[0];
  assert.equal(e.titulo, 'Consulta Dr. Fulano, retorno');
  assert.equal(e.local, 'Rua A, 100');
  assert.equal(e.descricao, 'Levar exames\nde sangue');
  assert.equal(e.rrule, 'FREQ=WEEKLY;BYDAY=FR;COUNT=4');
  assert.equal(e.exdates.length, 1);
  assert.deepEqual(e.alarmes.map((a) => a.trigger), ['-PT1H', '-P1D']);
  assert.equal(cal.eventos[1].titulo, 'Pagar condomínio com uma descrição muito longa que o Apple dobra em várias linhas no arquivo exportado');
  assert.equal(cal.eventos[2].recurrenceId.valor, '20261030T070000');
});

test('datas: com fuso, em UTC e dia inteiro', () => {
  assert.deepEqual(dataGoogle({ valor: '20261016T070000', tzid: 'America/Manaus' }), { dateTime: '2026-10-16T07:00:00', timeZone: 'America/Manaus' });
  assert.deepEqual(dataGoogle({ valor: '20261016T110000Z' }), { dateTime: '2026-10-16T11:00:00Z' });
  assert.deepEqual(dataGoogle({ valor: '20261101', data: true }), { date: '2026-11-01' });
  assert.deepEqual(dataGoogle({ valor: '20261101' }), { date: '2026-11-01' });
});

test('alarmes viram minutos antes; depois do início ou absoluto é descartado', () => {
  assert.equal(minutosDoTrigger('-PT1H'), 60);
  assert.equal(minutosDoTrigger('-PT30M'), 30);
  assert.equal(minutosDoTrigger('-P1D'), 1440);
  assert.equal(minutosDoTrigger('-P1DT2H'), 1560);
  assert.equal(minutosDoTrigger('PT0S'), 0);
  assert.equal(minutosDoTrigger('PT15M'), null);
  assert.equal(minutosDoTrigger('20261016T070000Z'), null);
});

test('recorrência no formato do Google agrupa EXDATE por fuso', () => {
  const cal = lerIcs(AMOSTRA);
  assert.deepEqual(recorrenciaGoogle(cal.eventos[0]), ['RRULE:FREQ=WEEKLY;BYDAY=FR;COUNT=4', 'EXDATE;TZID=America/Manaus:20261023T070000']);
  assert.deepEqual(recorrenciaGoogle(cal.eventos[1]), []);
});

test('duração ISO', () => {
  assert.equal(msDaDuracao('PT1H30M'), 5400000);
  assert.equal(msDaDuracao('P1D'), 86400000);
});

test('desdobrar junta continuação com espaço ou tab', () => {
  assert.deepEqual(desdobrar('A:1\r\n b\r\nC:2\n\tc'), ['A:1b', 'C:2c']);
});
