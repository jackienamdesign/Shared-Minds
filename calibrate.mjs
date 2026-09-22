/**
 * Calibration harness.
 *
 *   node calibrate.mjs              every case
 *   node calibrate.mjs body mixed   only cases whose expected tag matches
 *
 * Runs calibration.js through the real judge in judge.js, against the live
 * proxy, and reports three separate things that are easy to confuse:
 *
 *   VERDICT  did it float or pop the way calibration.js says it should
 *   TAG      did it do so for the stated reason
 *   LEXICON  what classify.js would have said if the network were down
 *
 * The third column is not a score. classify.js cannot see who a sentence is
 * about, so it will always lose the rule-2 and rule-3 blocks; the column is
 * there to show you how much worse the piece gets when it falls back, which is
 * the argument for keeping SELF_AS_CASUALTY growing.
 *
 * Needs Node 22+ (it imports the browser's .js modules directly, which relies
 * on automatic module syntax detection). No dependencies, no build.
 */

import { judge } from './public/week1/judge.js';
import { classify } from './public/week1/classify.js';
import { CASES } from './public/week1/calibration.js';

const CONCURRENCY = 6;

const only = process.argv.slice(2);
const cases = only.length ? CASES.filter((c) => only.includes(c.tag)) : CASES;

if (!cases.length) {
  console.error(`no cases with tag(s): ${only.join(', ')}`);
  process.exit(1);
}

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`
};

/** Fixed-size worker pool. The proxy is slow (3-8s) and shared — don't flood it. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

const results = await pool(cases, CONCURRENCY, async (c) => {
  const t0 = Date.now();
  const got = await judge(c.text);
  return { ...c, got, lex: classify(c.text), ms: Date.now() - t0 };
});

const SHOW = 46;
const failures = [];

console.log(
  C.bold(`\n  ${'VERDICT'.padEnd(9)}${'TAG'.padEnd(18)}${'LEXICON'.padEnd(9)}  THOUGHT\n`)
);

for (const r of results) {
  // A null judge means unreachable, which is a harness problem, not a verdict.
  const verdict = r.got ? r.got.verdict : null;
  const tag = r.got ? r.got.tag : '—';

  const verdictOk = verdict === r.want;
  const tagOk = verdictOk && tag === r.tag;
  const lexOk = r.lex === r.want;

  if (!r.got) failures.push({ ...r, why: 'unreachable' });
  else if (!verdictOk) failures.push({ ...r, why: 'verdict' });
  else if (!tagOk) failures.push({ ...r, why: 'tag' });

  const mark = !r.got ? C.yellow('!') : verdictOk ? (tagOk ? C.green('.') : C.yellow('~')) : C.red('X');
  const text = r.text === '' ? C.dim('(empty)') : r.text;

  console.log(
    `${mark} ` +
      `${(verdictOk ? C.dim : C.red)((verdict || 'null').padEnd(9))}` +
      `${(tagOk ? C.dim : C.yellow)(tag.padEnd(18))}` +
      `${(lexOk ? C.dim : C.red)(r.lex.padEnd(9))}` +
      `  ${text.length > SHOW ? text.slice(0, SHOW - 1) + '…' : text}`
  );
}

// --- summary ---------------------------------------------------------------

const n = results.length;
const verdictHits = results.filter((r) => r.got && r.got.verdict === r.want).length;
const tagHits = results.filter((r) => r.got && r.got.verdict === r.want && r.got.tag === r.tag).length;
const lexHits = results.filter((r) => r.lex === r.want).length;
const disagree = results.filter((r) => r.got && r.got.verdict !== r.lex).length;
const pct = (x) => `${String(x).padStart(2)}/${n}  ${String(Math.round((x / n) * 100)).padStart(3)}%`;

console.log(C.bold('\n  ── summary ────────────────────────────────'));
console.log(`  verdict correct     ${pct(verdictHits)}`);
console.log(`  tag also correct    ${pct(tagHits)}`);
console.log(C.dim(`  lexicon fallback    ${pct(lexHits)}   (expected to lose rules 2 and 3)`));
console.log(C.dim(`  judge vs lexicon    ${disagree} disagreements`));

if (failures.length) {
  console.log(C.bold('\n  ── to decide ──────────────────────────────'));
  console.log(C.dim('  For each: is the RUBRIC wrong, or was the expectation?\n'));
  for (const f of failures) {
    const got = f.got ? `${f.got.verdict}/${f.got.tag}` : 'unreachable';
    console.log(`  ${C.red(f.why.padEnd(12))} want ${f.want}/${f.tag}`);
    console.log(`  ${''.padEnd(12)} got  ${got}`);
    console.log(`  ${''.padEnd(12)} ${C.dim(JSON.stringify(f.text))}\n`);
  }
}

console.log('');
process.exit(failures.some((f) => f.why === 'verdict') ? 1 : 0);
