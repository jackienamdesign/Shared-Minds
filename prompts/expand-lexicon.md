# Prompt — expand the lexicon

Written against the exact contract in `classify.js`, so output pastes back in
without editing. Copy everything below the line.

**Read this first.** You asked for a bigger repository of words that can't be
used. After the calibration round, that repository is *the entire language* —
`classify.js` destroys by default and exempts only work, study, and money. So
there is no forbidden list left to grow. The two lists that still decide
anything are:

- `PERMITTED_WORDS` — the exemption. Every word added here is a **hole** in the
  piece, so this list grows *narrowly and suspiciously*.
- `SELF_AS_CASUALTY` — phrases that pop a thought even when a permitted word is
  present. This one grows *generously*.

Run it repeatedly with a different `FOCUS` line.

---

You are helping build the word lists for an interactive art piece called *Shared
Minds*. A person types a thought into a canvas. It floats as a bubble, or it is
destroyed the instant it is recognized as being about the person themselves. The
piece is about a system that permits a person to exist only as an economic unit.

## The classifier you are writing lists for

```js
float = isProductive && !selfIsTheCasualty
```

- `isProductive` — the text contains a token from `PERMITTED_WORDS`
- `selfIsTheCasualty` — the text contains a contiguous phrase from
  `SELF_AS_CASUALTY`, which **overrides** the exemption

The default verdict is destruction. `"i'm thinking about my dog"` pops, not
because dogs are forbidden but because dogs are not billable. `"i'm exhausted
from work"` floats — exhaustion is a receipt for labor delivered. `"my job is
destroying me"` pops despite containing `job`, because the sentence has turned
around: the work is now the actor and the person is the thing being spent.

**You may be tired for the work. The work may not be blamed for you.**

FOCUS: _(blank for a general pass, or name one — e.g. "gig and service work",
"academic life", "immigration and visa labor", "care work and unpaid labor",
"the language of being used up")_

## Task A — extend `PERMITTED_WORDS`, narrowly

Add **40–70** tokens naming work, study, job-seeking, or money. Trades and
service work, freelance and gig platforms, healthcare and academic labor,
benefits, banking, immigration paperwork — the current list skews toward
salaried desk work and should not.

**Every candidate must survive the leak test**, which is the whole discipline
of this task. Write the word into an ordinary sentence a lonely person might
type at 2am. If that sentence would now *float*, the word is a leak — reject it
and say so.

Real leaks already caught and removed from this list:

| word | the sentence that killed it |
|---|---|
| `call` | i should call my mom |
| `save` | nobody can save me |
| `credit` | i never give myself credit |
| `goal` | my goal is to just be happy |
| `plans` | i have no plans this weekend |
| `laid` | i laid in bed all day |
| `cheap` | i feel cheap |
| `spend` | i spend too much time hating myself |

The pattern: a word earns its place only if it is **near-unusable in an
emotional sentence**. `invoice` is safe. `worth` never could be. When torn,
exclude — under-permitting makes the piece harsher, which is correct.

## Task B — extend `SELF_AS_CASUALTY`, generously

Add **60–100** phrases where labor consumes the person doing it. This is the
piece's one moment of mercy and it should be rich. Cover:

- **consumption** — eating me alive, chewing me up, grinding me down
- **depletion** — nothing left of me, running on empty, used up
- **replaceability** — just a number, a cog, replaceable, a body in a seat
- **self-loss** — don't recognize myself, forgot who i was before this
- **the body billing back** — my hands shake, can't stop clenching my jaw
- **the reckoning** — what it cost me, was it worth it, i gave it everything
- **flat resignation** — this is just what it is now, i've stopped noticing

Include how people actually type: contractions both ways (`its`/`it's`), dropped
subjects, understatement. The quiet ones land hardest.

## Hard mechanical constraints

The tokenizer lowercases, normalizes curly apostrophes to `'`, then splits on
`/[^a-z']+/`. Therefore:

- Tokens contain **only** `a–z` and internal apostrophes. No digits, accents, or
  hyphens — `part-time` becomes two tokens, so submit `part` and `time`
  separately (and note that both are leaks).
- `SELF_AS_CASUALTY` phrases must be **contiguous, space-separated, lowercase,
  punctuation-free**: `"eating me alive"`, not `"eating me alive!"`. Supply
  apostrophe variants as separate entries (`its costing me` and
  `it's costing me`) — the tokenizer preserves internal apostrophes, so they do
  not match each other.
- No duplicates, and none against the existing lists below.

## Output format

JavaScript array literals only, ready to paste over the existing ones — same
style as the source: lowercase quoted strings, wrapped lines, grouped under `//`
category comments. No prose around them, no markdown fences.

```
export const PERMITTED_WORDS = [ /* existing + additions, grouped */ ];
export const SELF_AS_CASUALTY = [ /* existing + additions, grouped */ ];
```

Then, after the arrays, a block comment titled `REJECTED AS LEAKS` listing every
`PERMITTED_WORDS` candidate you excluded, each with the 2am sentence that would
have floated. That table is the most useful thing you produce — it is the piece
arguing with itself.

## Current lists (extend around these; do not repeat)

PERMITTED_WORDS: work, working, works, worked, job, jobs, boss, manager,
deadline, deadlines, meeting, meetings, email, emails, office, shift, shifts,
overtime, colleague, coworker, team, client, clients, customer, contract,
freelance, gig, study, studying, studied, class, classes, homework, assignment,
exam, exams, midterm, finals, thesis, dissertation, paper, essay, lecture,
seminar, semester, school, college, university, degree, grade, grades, gpa,
professor, career, resume, cv, portfolio, application, applications, apply,
applying, applied, interview, interviews, recruiter, offer, rejection, referral,
linkedin, networking, internship, intern, promotion, raise, hired, hiring,
fired, unemployed, employment, project, projects, presentation, deck, report,
task, tasks, todo, productive, productivity, deliverable, launch, ship,
shipping, quarter, okr, kpi, sprint, backlog, code, review, deploy, bug,
feature, money, salary, wage, wages, paycheck, pay, paid, paying, afford, cost,
costs, expensive, income, earn, earning, savings, budget, invoice, refund,
deposit, account, bank, taxes, tax, rent, bills, bill, mortgage, insurance,
loan, loans, debt, payment, lease, utilities, groceries, errands, appointment,
flight, visa, paperwork, form, forms, future, schedule

SELF_AS_CASUALTY: destroying me, destroyed me, killing me, killed me, ruining
me, ruined me, breaking me, broke me, broken me, crushing me, draining me,
drained me, eating me alive, eating me up, wearing me down, wore me down,
burning me out, burnt me out, burned me out, consuming me, swallowing me,
hollowing me out, taking everything from me, taking everything out of me,
sucking the life out of me, nothing left of me, nothing left over, what it costs
me, what its costing me, what it's costing me, lost myself in, losing myself in,
not worth it anymore, all i am, all i have become, all im good for, all i'm good
for, only good for, just a number, a machine, a robot
