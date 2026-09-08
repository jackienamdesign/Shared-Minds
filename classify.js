/**
 * Thought classification.
 *
 *   reject = refersToSelf && aboutTheInteriorSelf && !aboutWork
 *
 * The distinction is NOT "has a pronoun". "my taxes" and "my shame" both have
 * one — the difference is what the possessive attaches to. Taxes are a thing
 * you manage; shame is a part of you. So the trigger is the noun, not the
 * grammar: a first-person reference only counts when it lands on something
 * interior — identity, feeling, body, worth, self-care.
 *
 * You may worry about your obligations. You may not worry about yourself.
 *
 * These lists are the editorial voice of the piece, not configuration — they
 * are meant to be edited. The matching is deliberately crude. Systems that
 * police what people are allowed to say are exactly this dumb, and the
 * misfires are part of the point.
 */

/** First-person reference. Necessary, but no longer sufficient on its own. */
export const SELF_PRONOUNS = [
  'i', 'me', 'my', 'mine', 'myself',
  "i'm", 'im', "i've", 'ive', "i'd", "i'll"
];

/**
 * The interior self: things you *are*, not things you *have*. This is the list
 * that actually decides. "my taxes" has no word from here and floats; "my
 * identity" does and is destroyed.
 */
export const INTERIOR_CONCERNS = [
  // selfhood
  'identity', 'self', 'myself', 'worth', 'esteem', 'confidence', 'purpose',
  'meaning', 'potential', 'personality', 'character', 'future', 'place',
  // shame family
  'shame', 'ashamed', 'guilt', 'guilty', 'regret', 'embarrassed',
  'humiliated', 'selfish',
  // isolation
  'lonely', 'loneliness', 'alone', 'isolated', 'unwanted', 'unloved',
  // mood
  'sad', 'sadness', 'depressed', 'depression', 'grief', 'grieving',
  'happiness', 'happy', 'joy', 'love', 'loved', 'lovable', 'unlovable',
  // fear
  'anxious', 'anxiety', 'afraid', 'scared', 'fear', 'fears', 'terrified',
  'dread', 'insecure', 'insecurity',
  // depletion
  'tired', 'exhausted', 'exhaustion', 'burnout', 'drained', 'overwhelmed',
  // the body
  'body', 'health', 'weight', 'appearance', 'ugly', 'skin', 'face',
  // interiority
  'mind', 'soul', 'heart', 'feel', 'feeling', 'feelings', 'emotions',
  'emotional', 'dreams',
  // inadequacy
  'failure', 'failing', 'enough', 'inadequate', 'worthless', 'useless',
  'broken', 'empty', 'numb',
  // repair
  'therapy', 'healing', 'heal', 'rest', 'sleep', 'boundaries'
];

/**
 * Practical, external, productive. Overrides the interior signal, so
 * "I'm exhausted from work" survives while "I'm exhausted" does not.
 * Empty this array to make the piece considerably harsher.
 */
export const WORK_WORDS = [
  'work', 'working', 'job', 'boss', 'deadline', 'deadlines', 'meeting',
  'meetings', 'email', 'emails', 'study', 'studying', 'studied', 'class',
  'classes', 'homework', 'assignment', 'exam', 'midterm', 'final', 'finals',
  'thesis', 'paper', 'essay', 'project', 'presentation', 'client', 'intern',
  'internship', 'resume', 'portfolio', 'application', 'apply', 'career',
  'task', 'tasks', 'todo', 'productive', 'productivity', 'grade', 'grades',
  'school', 'office', 'shift', 'code', 'review', 'launch', 'ship', 'quarter',
  'okr', 'sprint',
  // external obligations — things you have, not things you are
  'taxes', 'tax', 'rent', 'bills', 'bill', 'mortgage', 'insurance', 'loan',
  'loans', 'debt', 'money', 'budget', 'groceries', 'laundry', 'dishes',
  'appointment', 'flight', 'car', 'visa', 'paperwork'
];

/**
 * Multi-word self-concern that no single token catches. Matched against the
 * normalized token stream, so punctuation and casing don't matter.
 */
export const SELF_PHRASES = [
  'who i am', 'who am i', 'what i want', 'what i need', 'good enough',
  'not enough', 'care of myself', 'be myself', 'hate myself', 'love myself',
  'by myself', 'i deserve', 'i matter', 'let myself', 'my place',
  'my worth', 'my purpose'
];

const SELF = new Set(SELF_PRONOUNS);
const INTERIOR = new Set(INTERIOR_CONCERNS);
const WORK = new Set(WORK_WORDS);

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

  const hasSelf = tokens.some((t) => SELF.has(t));
  const hasWork = tokens.some((t) => WORK.has(t));
  const hasInterior =
    tokens.some((t) => INTERIOR.has(t)) ||
    SELF_PHRASES.some((p) => stream.includes(` ${p} `));

  return hasSelf && hasInterior && !hasWork ? 'rejected' : 'floating';
}
