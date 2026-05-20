// Per-question 1–2 line explanations rendered below the prompt in
// V10Quiz to clarify what each item is measuring, with a concrete
// example where useful. Keyed by question code. Items not present
// here fall back to no explanation (rendered with the bare prompt).

export const PSYCH_EXPLANATIONS: Record<string, string> = {
  // ── C-1 Risk Tolerance ───────────────────────────────────────────────
  'C1-Q1':
    'Tests how you react under unrealised paper loss. Selling crystallises the loss; holding banks on mean-reversion.',
  'C1-Q2':
    'Maps return appetite vs volatility tolerance. e.g. picking 14% / ±25% means you accept a ₹25 L swing on ₹1 Cr to chase the higher mean.',
  'C1-Q3':
    'Captures the first emotional reflex to a market shock — fear, neutrality, or opportunity-seeking.',
  'C1-Q4':
    'Frame-dependence check. "Lost 10% but beat a falling market" is the same absolute outcome — your preferred frame reveals loss aversion.',
  'C1-Q5':
    'The risk premium you require. Demanding 6+ extra points over FD signals high risk aversion; 1 point signals comfort with equity.',
  'C1-R1':
    'Sanity check (reverse-coded): agreement here contradicts a "true equity investor" stance taken elsewhere.',

  // ── C-2 Loss Aversion ────────────────────────────────────────────────
  'C2-Q1':
    '50/50 bet, equal stakes. Sincere risk-neutrality says yes; "no" reflects classic Kahneman-Tversky loss aversion (losses hurt ~2× more than gains feel good).',
  'C2-Q2':
    '2:1 odds in your favour. Refusing here means loss aversion is winning even when the expected value strongly favours the bet (+₹50,000 EV).',
  'C2-Q3':
    'Action vs inaction regret. "Losing on what I did" usually hurts more than "missing what I didn\'t" — but the dollar amount is the same.',
  'C2-Q4':
    'Direct self-report of asymmetric pain. The classical loss-aversion finding holds for most people.',
  'C2-R1':
    'Reverse-coded — if "a 20% drop wouldn\'t affect my plan" is "strongly agree", you\'re showing real composure.',

  // ── C-3 Time Preference ──────────────────────────────────────────────
  'C3-Q1':
    'Discount-rate sensitivity. ₹50K now vs ₹1 L in 5 yrs implies ~15% IRR — picking sooner means a steep personal discount rate.',
  'C3-Q2':
    '15-year horizon empathy. Equity SIPs reward patience; if 15 years feels unreachable, behavioural finance predicts you\'ll churn.',
  'C3-Q3':
    'Patience under invisible compounding. SIPs look flat for years before the curve bends — can you stay invested through the flat part?',

  // ── C-4 Financial Self-Efficacy ──────────────────────────────────────
  'C4-Q1':
    'Belief in your own competence. Self-efficacy predicts whether plans get executed — not just made.',
  'C4-Q2':
    'Stress liquidity test. A ₹2 L surprise (hospitalisation, urgent repair) — how prepared do you feel right now?',
  'C4-Q3':
    'Self-knowledge of your own finances. "Precisely" requires you can name your net worth and cashflow within 10% from memory.',
  'C4-R1':
    'Reverse-coded honest check. "Out of my depth" agreement here calibrates against the Q1 self-rating.',

  // ── C-5 Locus of Control ─────────────────────────────────────────────
  'C5-Q1':
    'External vs internal attribution. Believing outcomes are luck-driven correlates with passive financial behaviour.',
  'C5-Q2':
    'Post-loss attribution. Internal ("I should have researched more") predicts better future decisions than external ("market screwed me").',
  'C5-Q3':
    'Past-decision ownership. Identifying a missed-action regret signals an active orientation.',

  // ── C-6 Money Avoidance ──────────────────────────────────────────────
  'C6-Q1':
    'Klontz Money Avoidance script: "rich = greedy". Agreement here predicts self-sabotaging savings behaviour.',
  'C6-Q2':
    'Moral suspicion of money. Strong agreement often correlates with leaving money in low-yield accounts as "safer / cleaner".',
  'C6-Q3':
    'Survivor guilt around wealth. e.g. "I don\'t deserve more than my parents had" can prevent you from accepting a fair raise.',

  // ── C-7 Money Worship ────────────────────────────────────────────────
  'C7-Q1':
    'Klontz Money Worship: linking happiness to corpus size. High agreement predicts over-spending in pursuit of "more".',
  'C7-Q2':
    'Belief money solves life problems. Often surfaces as chasing high-risk returns to "finally fix things".',
  'C7-Q3':
    '"Enough" calibration. Money worshippers cannot define enough, which makes retirement planning emotionally difficult.',

  // ── C-8 Money Status ─────────────────────────────────────────────────
  'C8-Q1':
    'Self-worth tied to net worth. Strong agreement predicts visible-consumption traps (car, watch, address).',
  'C8-Q2':
    'Comparison-driven anxiety. Status scripts often surface as "the neighbour bought…" decisions.',
  'C8-Q3':
    'Lifestyle-as-signal. The car / watch / address as identity rather than utility.',

  // ── C-9 Money Vigilance ──────────────────────────────────────────────
  'C9-Q1':
    'Klontz Money Vigilance: emergency-fund mindset. Generally healthy in moderation; extreme = under-investing in growth assets.',
  'C9-Q2':
    'Privacy around money. Cultural in many Indian households; not pathological unless it prevents joint planning.',
  'C9-Q3':
    'Embarrassment about wealth (in either direction). Can block productive money conversations with family / advisor.',

  // ── C-10 Mental Accounting ───────────────────────────────────────────
  'C10-Q1':
    'Thaler\'s mental-accounting test. ₹1 L is ₹1 L — treating "bonus" money differently from "salary" money reveals account-segmentation bias.',
  'C10-Q2':
    'Funds-fungibility test. The wedding money has the LONGEST horizon, but most people refuse to invest it because of the label on the bucket.',
  'C10-Q3':
    '"Hard-earned" vs "easy" money framing. Strong agreement often leads to gifts/inheritance being wasted on consumption.',

  // ── C-11 Herding / Social ────────────────────────────────────────────
  'C11-Q1':
    'Friend-tip vulnerability. The fund had a hot 6 months — chasing it now usually means buying at the top.',
  'C11-Q2':
    'Crowd-following heuristic. "Everyone\'s doing it" is uncorrelated with whether you should.',
  'C11-Q3':
    'WhatsApp tip filter. "Guaranteed returns" are illegal in India and a hallmark of pump-and-dump schemes.',
  'C11-Q4':
    'Family-influence weight on investing decisions. Healthy when expertise exists in the family; risky when it\'s opinion only.',
  'C11-Q5':
    'Trust-but-verify on family tips. Agreement here is the right answer: investigate before investing.',
  'C11-R1':
    'Reverse-coded: "I research everything independently" — agreement here aligns with strong locus of control.',

  // ── C-12 Recency / Overconfidence ────────────────────────────────────
  'C12-Q1':
    'Mean-reversion check. Small-caps reverting to ~12-14% is the long-run norm; expecting 25% extrapolates the recent past.',
  'C12-Q2':
    'Self-assessed competence relative to peers. "Well above average" from most respondents is statistically impossible — that\'s the overconfidence signal.',
  'C12-Q3':
    'Direct stock-picking confidence. Strong agreement predicts churn, concentration risk, and underperformance vs index over 10+ yrs.',

  // ── C-13 Financial Literacy (knowledge MCQs) ─────────────────────────
  'C13-Q1':
    'Compound interest basics. ₹1 L at 5% for 2 years is ₹1,10,250 — slightly MORE than simple interest of ₹1,10,000.',
  'C13-Q2':
    'Inflation > return = purchasing-power loss. 4% earned − 6% inflation = real return of −2%/yr.',
  'C13-Q3':
    'Diversification. A single stock is RISKIER than a mutual fund holding 50–100 stocks, not safer.',
  'C13-Q4':
    'Tax-free maturity products in India. PPF (Public Provident Fund) — interest accrued and corpus at maturity are both tax-free.',
  'C13-Q5':
    'NPS at retirement. At age 60, up to 60% of Tier-I corpus can be withdrawn tax-free; the rest annuitises.',
  'C13-Q6':
    'Equity LTCG post-Budget 2024. Held >12 months: 12.5% on gains above ₹1.25 L per year (replaced the older 10% / ₹1 L slab).',
  'C13-Q7':
    'Senior health-insurance reality. Premiums climb steeply after 60, and pre-existing diseases have a 2–4 year waiting period.',
  'C13-Q8':
    'NPS Tier 1 vs Tier 2. Tier 1 is locked till 60 (limited partial withdrawal allowed); Tier 2 is fully liquid (more like a debt MF).',
  'C13-Q9':
    'EPF vs EPS. EPF is your withdrawable retirement corpus; EPS funds a small monthly pension after 58.',
  'C13-Q10':
    'PPF lock-in: 15 years, extendable in 5-year blocks. Partial withdrawals allowed from year 7.',
  'C13-Q11':
    'SCSS basics. Open to seniors 60+ (55+ for VRS); rate is set quarterly by the government; interest is taxable.',
  'C13-D1':
    'Digital scam awareness. Approving a UPI "collect" request DEBITS your account — money moves OUT, not in.',
  'C13-D2':
    'SEBI registration check. sebi.gov.in/Intermediaries is the only authoritative source; Play Store ratings are not.',
  'C13-D3':
    'Fake-trading-app red flags: WhatsApp-only support, "guaranteed" returns, no SEBI registration, no nodal officer.',

  // ── C-14 Scam Vulnerability ──────────────────────────────────────────
  'C14-Q1':
    'OTP / KYC phone scam. Banks NEVER ask for OTPs over the phone. Verifying via the bank\'s published number is the safe path.',
  'C14-Q2':
    'Social-pressure scam vector. Relatives proposing financial offers exploits cultural deference — politely refusing is acceptable.',
  'C14-Q3':
    'Impossible-yield rule. 18% guaranteed in a country where 10-year G-Secs yield ~7% is mathematically a fraud or Ponzi structure.',
  'C14-Q4':
    'UPI "collect" request scam. Receiving real money never requires approving a request — only sending does.',
  'C14-Q5':
    'CBI / Aadhaar / "safe account" scam. No legitimate Indian agency demands urgent transfers; hang up and verify independently.',
  'C14-Q6':
    'Fake SEBI demand. SEBI does not levy "verification fees" on individuals over WhatsApp.',
  'C14-Q7':
    'QR-code switching scam. A fresh sticker over an older printed code is a classic redirection trick — pay only via verified payee names.',
  'C14-R1':
    'Reverse-coded: urgency SHOULD trigger suspicion, not compliance. Agreement here is the correct stance.',

  // ── C-15 Family Money Dynamics ───────────────────────────────────────
  'C15-Q1':
    'Decision-making structure in your household. Joint decisions correlate with better goal achievement than solo or fully-delegated.',
  'C15-Q2':
    'Spouse awareness of asset locations. A surviving spouse who can\'t locate the policy file faces months of recovery hassle.',
  'C15-Q3':
    'Dependant audit. Counting current AND expected support obligations (next 10 years) — under-counting here is a common planning gap.',
  'C15-Q4':
    'Money-talk openness at home. Predicts whether goals and trade-offs can be discussed without conflict.',

  // ── C-16 Future Time Perspective ─────────────────────────────────────
  'C16-Q1':
    'Concreteness of retirement vision. Vivid imagined detail predicts higher savings rates — the future self feels "real".',
  'C16-Q2':
    'Identity continuity with future-you. Hershfield\'s research: strong agreement predicts long-horizon investing behaviour.',
  'C16-Q3':
    'Reverse-coded check. Agreement here ("I rarely imagine 70") signals weak future-self continuity.',
}
