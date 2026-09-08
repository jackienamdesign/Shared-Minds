/**
 * Thought classification.
 *
 *   float = isProductive && !selfIsTheCasualty
 *
 * Note the shape. There is no list of forbidden feelings, because forbidding
 * feelings would imply the rest of a person is welcome here. It isn't. The
 * default verdict is destruction and the only exemption is usefulness: a
 * thought survives if, and only if, it concerns work, study, or money.
 *
 * This is why "i'm thinking about my dog" pops. Nothing is wrong with the dog.
 * The dog simply isn't billable.
 *
 * The one exemption has an exemption. "i'm exhausted from work" survives —
 * exhaustion is a productive byproduct, a receipt for labor delivered. "my job
 * is destroying me" does not, because the sentence has turned around: the work
 * is now the actor and the person is the thing being spent. You may be tired
 * for the work. The work may not be blamed for you.
 *
 * These lists are the editorial voice of the piece, not configuration — they
 * are meant to be edited. The matching is deliberately crude. Systems that
 * decide which parts of a person are permitted are exactly this dumb, and the
 * misfires are part of the point.
 */

/**
 * The permitted world. The load-bearing list: this is the entire set of things
 * a person is allowed to have on their mind. Everything absent from it — every
 * grief, every friend, every meal, every ordinary Tuesday — is destroyed on
 * submission.
 *
 * Adding a word here is an act of mercy. Delete the array to permit nothing.
 */
export const PERMITTED_WORDS = [
  // labor
  'work', 'working', 'works', 'worked', 'job', 'jobs', 'boss', 'manager',
  'deadline', 'deadlines', 'meeting', 'meetings', 'email', 'emails',
  'office', 'shift', 'shifts', 'overtime', 'colleague', 'coworker',
  'team', 'client', 'clients', 'customer', 'contract', 'freelance', 'gig',
  // study
  'study', 'studying', 'studied', 'class', 'classes', 'homework', 'assignment',
  'exam', 'exams', 'midterm', 'finals', 'thesis', 'dissertation',
  'paper', 'essay', 'lecture', 'seminar', 'semester', 'school', 'college',
  'university', 'degree', 'grade', 'grades', 'gpa', 'professor', 'deadline',
  // the search
  'career', 'resume', 'cv', 'portfolio', 'application', 'applications',
  'apply', 'applying', 'applied', 'interview', 'interviews', 'recruiter',
  'offer', 'rejection', 'referral', 'linkedin', 'networking', 'internship',
  'intern', 'promotion', 'raise', 'hired', 'hiring', 'fired',
  'unemployed', 'employment',
  // output
  'project', 'projects', 'presentation', 'deck', 'report', 'task', 'tasks',
  'todo', 'productive', 'productivity', 'deliverable', 'launch', 'ship',
  'shipping', 'quarter', 'okr', 'kpi', 'sprint', 'backlog', 'code', 'review',
  'deploy', 'bug', 'feature',
  // money
  'money', 'salary', 'wage', 'wages', 'paycheck', 'pay', 'paid', 'paying',
  'afford', 'cost', 'costs', 'expensive', 'income',
  'earn', 'earning', 'savings', 'budget',
  'invoice', 'refund', 'deposit', 'account', 'bank',
  // obligations — things you have, never things you are
  'taxes', 'tax', 'rent', 'bills', 'bill', 'mortgage', 'insurance', 'loan',
  'loans', 'debt', 'payment', 'lease', 'utilities', 'groceries', 'errands',
  'appointment', 'flight', 'visa', 'paperwork', 'form', 'forms', 'deadline',
  // the economic future, which is the only permitted kind
  'future', 'schedule'
];

/**
 * The exemption's exemption.
 *
 * These are matched even when a permitted word is present, and they win. Each
 * one describes labor consuming the person doing it — the moment a productive
 * sentence stops being about production. "my job is destroying me" contains
 * "job" and dies anyway.
 *
 * Matched against the normalized token stream, so punctuation and casing don't
 * matter. Every phrase must be a contiguous run of tokens.
 */
export const SELF_AS_CASUALTY = [
  'destroying me', 'destroyed me', 'killing me', 'killed me', 'ruining me',
  'ruined me', 'breaking me', 'broke me', 'broken me', 'crushing me',
  'draining me', 'drained me', 'eating me alive', 'eating me up',
  'wearing me down', 'wore me down', 'burning me out', 'burnt me out',
  'burned me out', 'consuming me', 'swallowing me', 'hollowing me out',
  'taking everything from me', 'taking everything out of me',
  'sucking the life out of me', 'nothing left of me', 'nothing left over',
  'what it costs me', 'what its costing me', "what it's costing me",
  'lost myself in', 'losing myself in', 'not worth it anymore',
  'all i am', 'all i have become', 'all im good for', "all i'm good for",
  'only good for', 'just a number', 'a machine', 'a robot'
];

const PERMITTED = new Set(PERMITTED_WORDS);

/**
 * Split into whole words, keeping apostrophes inside them.
 *
 * The smart-quote normalization is load-bearing: macOS substitutes ' for '
 * as you type, so a check for "i'm" would otherwise never match anything a
 * real person actually types.
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[’‘ʼ]/g, "'")
    .split(/[^a-z']+/)
    .filter(Boolean)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

/**
 * @returns {'rejected' | 'floating'}
 */
export function classify(text) {
  const tokens = tokenize(text);
  const stream = ` ${tokens.join(' ')} `;

  const isProductive = tokens.some((t) => PERMITTED.has(t));
  const selfIsTheCasualty = SELF_AS_CASUALTY.some((p) => stream.includes(` ${p} `));

  return isProductive && !selfIsTheCasualty ? 'floating' : 'rejected';
}
