// Goal Discovery preflight — static block content for the v10 Adaptive
// intake form. Phase 3: blocks 0, 1, 2, 4, 5 ship. Block 3 (per-goal
// interrogation) is deferred to a later phase.

export interface OptionLite { value: string; label: string; icon?: string }

// ─── Block 0 — Pre-flight scene tags ─────────────────────────────────────

export const GD_SCENE_TAGS: OptionLite[] = [
  { value: 'bereavement',    icon: '🕯️', label: 'Bereavement' },
  { value: 'divorce',        icon: '💔', label: 'Divorce / separation' },
  { value: 'layoff',         icon: '💼', label: 'Layoff / job loss' },
  { value: 'career-change',  icon: '🔄', label: 'Career change / pivot' },
  { value: 'illness',        icon: '🏥', label: 'Illness diagnosis' },
  { value: 'windfall',       icon: '💰', label: 'Windfall (bonus / inheritance / sale)' },
  { value: 'relocation',     icon: '🏘️', label: 'Relocation' },
  { value: 'child-event',    icon: '👶', label: 'Child event (wedding / education / birth)' },
  { value: 'parent-event',   icon: '👴', label: 'Parent event (care / illness / passing)' },
  { value: 'business-event', icon: '🏢', label: 'Business event (sale / launch / loss)' },
  { value: 'financial-stress', icon: '⚠️', label: 'Financial stress / debt' },
  { value: 'milestone',      icon: '🎯', label: 'Approaching a milestone age' },
  { value: 'none',           label: 'Nothing major' },
  { value: 'other',          icon: '✏️', label: 'Other (describe below)' },
]

// ─── Block 1 — Goal entries ──────────────────────────────────────────────

export const GD_GOAL_TYPES: OptionLite[] = [
  { value: 'retirement',  label: 'Retirement / financial independence' },
  { value: 'education',   label: 'Education (children / grandchildren)' },
  { value: 'real_estate', label: 'Real estate (home, second home, plot, ancestral)' },
  { value: 'business',    label: 'Business / venture' },
  { value: 'parent_care', label: 'Parent care' },
  { value: 'lifestyle',   label: 'Lifestyle (travel, hobbies, comfort)' },
  { value: 'legacy',      label: 'Legacy / inheritance' },
  { value: 'health',      label: 'Health / medical' },
  { value: 'other',       label: 'Other' },
]

export const GD_GOAL_AMOUNTS: OptionLite[] = [
  { value: 'lt10L',    label: 'Less than ₹10 L' },
  { value: '10L_25L',  label: '₹10 L – ₹25 L' },
  { value: '25L_50L',  label: '₹25 L – ₹50 L' },
  { value: '50L_1Cr',  label: '₹50 L – ₹1 Cr' },
  { value: '1Cr_2Cr',  label: '₹1 Cr – ₹2 Cr' },
  { value: '2Cr_5Cr',  label: '₹2 Cr – ₹5 Cr' },
  { value: '5Cr_plus', label: '₹5 Cr +' },
  { value: 'dontknow', label: "Don't know" },
]

export const GD_GOAL_HORIZONS: OptionLite[] = [
  { value: 'lt5',     label: 'Less than 5 years' },
  { value: '5_10',    label: '5 – 10 years' },
  { value: '10_15',   label: '10 – 15 years' },
  { value: '15_20',   label: '15 – 20 years' },
  { value: '20_25',   label: '20 – 25 years' },
  { value: '25_plus', label: '25+ years' },
  { value: 'unsure',  label: 'Not sure' },
]

export const GD_GOAL_PRIORITIES: OptionLite[] = [
  { value: 'must', label: 'Must-have' },
  { value: 'nice', label: 'Nice-to-have' },
]

export const GD_MAX_GOALS = 25

// ─── Block 2 — Kinder questions ──────────────────────────────────────────

export const KINDER_Q1 = {
  badge: 'Q1 · ☀️ Life Design',
  tagline: 'A normal Tuesday, money no longer a concern',
  prompt:
    'Imagine your bank account is genuinely full enough that money is no longer a concern — not a fantasy, just sufficient. Walk me through a normal Tuesday. Where are you, who\'s around, how do you spend the day?',
  placeholder:
    "e.g. 'I wake at 7, walk in the park with my wife. Read for an hour. Spend the afternoon with grandkids; play chess in the evenings. Two trips a year — Kerala in winter, Europe in summer.'\n\nDon't worry about polish — write the first thing that comes.",
}

export const KINDER_Q2 = {
  badge: 'Q2 · ⏳ Compression',
  tagline: 'Five to ten healthy years left — what changes?',
  prompt:
    'Your doctor tells you that you have five to ten healthy years left. Body\'s fine, mind\'s fine, but the runway is short. What changes immediately? What stays exactly the same?',
  placeholder:
    "e.g. 'I'd step back from the firm immediately. Travel to Manali with my wife. Tell my brother what I never told him. Stop saving and start spending on experiences.'\n\nWhat changes overnight? What stays the same?",
}

export const KINDER_Q3 = {
  badge: 'Q3 · 🕰 Regret',
  tagline: "24 hours left — what's still unsaid?",
  prompt: 'You have 24 hours left. What did you not do? Who did you not become? What is still unsaid?',
  placeholder:
    "e.g. 'I never wrote that book I always wanted to. Never told my brother how much he meant. Never spent enough time with my parents in their last decade.'\n\nWhat's still unsaid? Who did you not become?",
}

export const KINDER_Q2_STOP: OptionLite[] = [
  { value: 'Working entirely',                 label: 'Working entirely' },
  { value: 'Long-distance commutes',           label: 'Long-distance commutes' },
  { value: 'Specific obligations / boards',    label: 'Specific obligations / boards' },
  { value: 'Caring for others',                label: 'Caring for others' },
  { value: 'Saving / accumulating',            label: 'Saving / accumulating' },
  { value: 'Social obligations',               label: 'Social obligations' },
  { value: 'Nothing changes',                  label: 'Nothing changes' },
]

export const KINDER_Q2_START: OptionLite[] = [
  { value: 'Travel',                       label: 'Travel' },
  { value: 'Time with family',             label: 'Time with family' },
  { value: 'A creative project',           label: 'A creative project' },
  { value: 'Health / wellness focus',      label: 'Health / wellness focus' },
  { value: 'Mentoring / teaching',         label: 'Mentoring / teaching' },
  { value: 'Spiritual practice',           label: 'Spiritual practice' },
  { value: 'Letting go',                   label: 'Letting go' },
  { value: 'Nothing changes',              label: 'Nothing changes' },
]

export const KINDER_Q3_THEMES: OptionLite[] = [
  { value: 'Career path not taken',          label: 'Career path not taken' },
  { value: 'Relationships not nurtured',     label: 'Relationships not nurtured' },
  { value: 'Experiences missed',             label: 'Experiences missed' },
  { value: 'Creative work not done',         label: 'Creative work not done' },
  { value: 'Things left unsaid',             label: 'Things left unsaid' },
  { value: 'Risks not taken',                label: 'Risks not taken' },
  { value: 'Health not prioritized',         label: 'Health not prioritized' },
  { value: 'Personal growth not pursued',    label: 'Personal growth not pursued' },
  { value: 'No major regrets',               label: 'No major regrets' },
  { value: 'Other',                          label: 'Other' },
]

// ─── Block 4 — Trade-offs ────────────────────────────────────────────────

export const TRADEOFF_FUND_OPTIONS: OptionLite[] = [
  { value: 'Push retirement later',             label: 'Push retirement later' },
  { value: 'Add part-time income',              label: 'Add part-time income' },
  { value: 'Reduce monthly expenses',           label: 'Reduce monthly expenses' },
  { value: 'Use up a planned legacy',           label: 'Use up a planned legacy' },
  { value: 'Take on calculated investment risk', label: 'Take on calculated investment risk' },
  { value: 'Not sure',                          label: 'Not sure' },
]

// ─── Block 5 — Partner alignment ─────────────────────────────────────────

export const PARTNER_INVOLVEMENT: OptionLite[] = [
  { value: 'no',      label: 'No / not applicable' },
  { value: 'yes',     label: 'Yes, fully' },
  { value: 'partial', label: 'Sometimes / partial' },
]

// ─── Block metadata ──────────────────────────────────────────────────────

export const GD_BLOCKS = [
  { id: 'block-0', tab: '📋',  eyebrow: 'Setting the scene', title: 'Pre-flight',          tagline: 'Anything happening right now that I should know about?', time: '~90 sec' },
  { id: 'block-1', tab: '🎯',  eyebrow: 'Your aims',          title: 'Your goals',           tagline: 'Top 3 to 7 (up to 25) financial goals. Add what matters.',    time: '~2 min' },
  { id: 'block-2', tab: '💭',  eyebrow: 'Three reflections',  title: 'Kinder questions',     tagline: "Goals that aren't on the spreadsheet but matter most.",        time: '~8–10 min' },
  { id: 'block-4', tab: '⚖️', eyebrow: 'Forced choices',     title: 'Trade-offs',           tagline: 'Honest forced choices. Your pick usually tells more than ranking.', time: '~3–4 min' },
  { id: 'block-5', tab: '👥',  eyebrow: 'Together',           title: 'Partner alignment',    tagline: 'Does a partner share these financial decisions with you?',     time: '~5 min · optional' },
] as const
