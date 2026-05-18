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

// ─── Block 3 — Goal interrogation (per-goal probes) ─────────────────────

export interface ProbeDef {
  key: string                  // stable field key inside the goal's probe answers
  label: string                // question shown to the user
  options: OptionLite[]        // dropdown options
}

// Probes are keyed by goal-type. Each goal type can have 1–3 probes that
// surface only on the goal cards of that type. Probes are dropdowns
// (select) per v10. Verbatim from v10 source (lines 4040–4076).
export const BLOCK3_PROBES: Record<string, ProbeDef[]> = {
  retirement: [
    {
      key: 'why_age',
      label: 'Why this age specifically?',
      options: [
        { value: 'Milestone age',        label: 'Milestone age' },
        { value: 'Health concern',       label: 'Health concern' },
        { value: 'Pension start',        label: 'Pension start' },
        { value: 'Family expectation',   label: 'Family expectation' },
        { value: 'Always wanted to',     label: 'Always wanted to' },
        { value: 'No specific reason',   label: 'No specific reason' },
      ],
    },
    {
      key: 'tuesday',
      label: 'Retired-you on a Tuesday morning?',
      options: [
        { value: 'Travel',                       label: 'Travel' },
        { value: 'Hobby / creative',             label: 'Hobby / creative' },
        { value: 'Family / grandchildren',       label: 'Family / grandchildren' },
        { value: 'Community / volunteering',     label: 'Community / volunteering' },
        { value: 'Consulting / part-time work',  label: 'Consulting / part-time work' },
        { value: 'Sleep in / rest',              label: 'Sleep in / rest' },
        { value: 'Other',                        label: 'Other' },
      ],
    },
    {
      key: 'partial',
      label: 'Would part-time at that age satisfy?',
      options: [
        { value: 'Yes — part-time is fine',      label: 'Yes — part-time is fine' },
        { value: 'No — full stop only',          label: 'No — full stop only' },
        { value: 'Depends on income / situation', label: 'Depends on income / situation' },
        { value: 'Not sure',                     label: 'Not sure' },
      ],
    },
  ],
  real_estate: [
    {
      key: 'whose',
      label: 'Whose house is in your mental picture?',
      options: [
        { value: 'Yours (forever home)',           label: 'Yours (forever home)' },
        { value: "Children's",                      label: "Children's" },
        { value: "Parents' / ancestral upgrade",   label: "Parents' / ancestral upgrade" },
        { value: 'Investment property',            label: 'Investment property' },
        { value: 'Multiple',                       label: 'Multiple' },
      ],
    },
    {
      key: 'why_own',
      label: 'Why ownership specifically (vs renting)?',
      options: [
        { value: 'Stability / security',           label: 'Stability / security' },
        { value: 'Wealth building',                label: 'Wealth building' },
        { value: 'Cultural / family expectation',  label: 'Cultural / family expectation' },
        { value: 'Forced saving',                  label: 'Forced saving' },
        { value: 'Investment return',              label: 'Investment return' },
        { value: 'Other',                          label: 'Other' },
      ],
    },
    {
      key: 'urgency',
      label: 'How urgent is this?',
      options: [
        { value: 'Within 2 years',  label: 'Within 2 years' },
        { value: '2 – 5 years',     label: '2 – 5 years' },
        { value: '5 – 10 years',    label: '5 – 10 years' },
        { value: 'Longer / flexible', label: 'Longer / flexible' },
        { value: 'Already underway',  label: 'Already underway' },
      ],
    },
  ],
  education: [
    {
      key: 'outcome',
      label: 'What outcome are you funding?',
      options: [
        { value: 'Credential / brand-name school', label: 'Credential / brand-name school' },
        { value: 'Skill / capability',             label: 'Skill / capability' },
        { value: 'Optionality / safety net',       label: 'Optionality / safety net' },
        { value: 'Social signal',                  label: 'Social signal' },
        { value: 'Not sure',                       label: 'Not sure' },
      ],
    },
    {
      key: 'where',
      label: 'Where (foreign vs India)?',
      options: [
        { value: 'Foreign specifically', label: 'Foreign specifically' },
        { value: 'Best Indian options',  label: 'Best Indian options' },
        { value: 'Either is fine',       label: 'Either is fine' },
        { value: 'Not sure yet',         label: 'Not sure yet' },
      ],
    },
    {
      key: 'tier',
      label: 'Education tier (level)',
      options: [
        { value: 'School',         label: 'School' },
        { value: 'Undergraduate',  label: 'Undergraduate' },
        { value: 'Post-graduate',  label: 'Post-graduate' },
        { value: 'Multiple tiers', label: 'Multiple tiers' },
      ],
    },
  ],
  business: [
    {
      key: 'what_is_goal',
      label: 'Is the goal the venture itself, or…?',
      options: [
        { value: 'The venture',         label: 'The venture' },
        { value: 'Freedom / autonomy',  label: 'Freedom / autonomy' },
        { value: 'Identity / legacy',   label: 'Identity / legacy' },
        { value: 'Wealth from exit',    label: 'Wealth from exit' },
        { value: 'All of the above',    label: 'All of the above' },
      ],
    },
    {
      key: 'day_after',
      label: 'What does the day after exit look like?',
      options: [
        { value: 'Start another',         label: 'Start another' },
        { value: 'Retire / travel',       label: 'Retire / travel' },
        { value: 'Family / hobby focus',  label: 'Family / hobby focus' },
        { value: 'Consulting',            label: 'Consulting' },
        { value: 'Not thought about it',  label: 'Not thought about it' },
      ],
    },
  ],
  parent_care: [
    {
      key: 'obligation',
      label: 'Financial or presence obligation?',
      options: [
        { value: 'Mostly financial',                 label: 'Mostly financial' },
        { value: 'Mostly presence (time / care)',    label: 'Mostly presence (time / care)' },
        { value: 'Both equally',                     label: 'Both equally' },
        { value: 'Neither — they are independent',   label: 'Neither — they are independent' },
      ],
    },
    {
      key: 'siblings',
      label: 'Are siblings sharing this?',
      options: [
        { value: 'Yes, evenly shared',      label: 'Yes, evenly shared' },
        { value: 'I take more',             label: 'I take more' },
        { value: 'I take less',             label: 'I take less' },
        { value: 'Sitting entirely on me',  label: 'Sitting entirely on me' },
        { value: 'Only child / no siblings', label: 'Only child / no siblings' },
        { value: 'Not applicable',          label: 'Not applicable' },
      ],
    },
  ],
  lifestyle: [
    {
      key: 'core',
      label: 'What part of lifestyle matters most?',
      options: [
        { value: 'Travel',                    label: 'Travel' },
        { value: 'Experiences / hobbies',     label: 'Experiences / hobbies' },
        { value: 'Home / living comfort',     label: 'Home / living comfort' },
        { value: 'Wellness / fitness',        label: 'Wellness / fitness' },
        { value: 'Discretionary freedom',     label: 'Discretionary freedom' },
        { value: 'Other',                     label: 'Other' },
      ],
    },
    {
      key: 'urgency',
      label: 'Time-bound?',
      options: [
        { value: 'Yes, want it now',  label: 'Yes, want it now' },
        { value: 'Within 5 years',    label: 'Within 5 years' },
        { value: 'Whenever feasible', label: 'Whenever feasible' },
        { value: 'Not time-bound',    label: 'Not time-bound' },
      ],
    },
  ],
  legacy: [
    {
      key: 'who',
      label: 'Specific person or general continuation?',
      options: [
        { value: 'Specific person',                  label: 'Specific person' },
        { value: 'Children collectively',            label: 'Children collectively' },
        { value: 'Charitable / cause',               label: 'Charitable / cause' },
        { value: 'Multi-generational continuation',  label: 'Multi-generational continuation' },
        { value: 'Not sure',                         label: 'Not sure' },
      ],
    },
    {
      key: 'use',
      label: "What would they do with it that you'd hope for?",
      options: [
        { value: 'Education',           label: 'Education' },
        { value: 'Business / venture',  label: 'Business / venture' },
        { value: 'Home',                label: 'Home' },
        { value: 'Preserve / grow',     label: 'Preserve / grow' },
        { value: 'Whatever they choose', label: 'Whatever they choose' },
      ],
    },
  ],
  health: [
    {
      key: 'plan',
      label: 'What kind of health goal?',
      options: [
        { value: 'Build a corpus for major medical events',    label: 'Build a corpus for major medical events' },
        { value: 'Top-up insurance',                            label: 'Top-up insurance' },
        { value: 'Wellness / preventive (gym / diet / coach)',  label: 'Wellness / preventive (gym / diet / coach)' },
        { value: 'Long-term care reserve',                      label: 'Long-term care reserve' },
        { value: 'Other',                                       label: 'Other' },
      ],
    },
  ],
  other: [
    {
      key: 'success',
      label: 'What does success look like, concretely?',
      options: [
        { value: 'Specific amount in a specific account',  label: 'Specific amount in a specific account' },
        { value: 'A life change',                          label: 'A life change' },
        { value: 'A relationship change',                  label: 'A relationship change' },
        { value: 'A capability',                           label: 'A capability' },
        { value: 'Other',                                  label: 'Other' },
      ],
    },
  ],
}

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
  { id: 'block-3', tab: '🔍',  eyebrow: 'Going deeper',       title: 'Goal interrogation',   tagline: 'A few short follow-ups per goal. Pick what you would actually say.', time: '~5–7 min' },
  { id: 'block-4', tab: '⚖️', eyebrow: 'Forced choices',     title: 'Trade-offs',           tagline: 'Honest forced choices. Your pick usually tells more than ranking.', time: '~3–4 min' },
  { id: 'block-5', tab: '👥',  eyebrow: 'Together',           title: 'Partner alignment',    tagline: 'Does a partner share these financial decisions with you?',     time: '~5 min · optional' },
] as const
