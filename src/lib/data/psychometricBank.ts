// v10 Adaptive Psychometric — 74-item question bank.
// Extracted verbatim from RetireWise_Psychometric_Assessment_Tool_v10_Adaptive.html (2026-05-16).
// Reverse-coded items (suffix -R*) have pre-inverted scores so all items read "higher = more of the construct".

import type { PsychQuestion } from '../../types/psychometric'

export const PSYCH_QUESTIONS: PsychQuestion[] = [
  // ── C-1 Risk Tolerance ───────────────────────────────────────────────
  {
    code: 'C1-Q1', construct: 'C-1', constructName: 'Risk Tolerance', scale: '5-point-likert',
    question: 'An investment of ₹10 lakh in a balanced mutual fund is now worth ₹8 lakh after six months of market decline. What would you most likely do?',
    options: [
      { label: 'Sell everything and move to FD', score: 1 },
      { label: 'Sell half, keep half', score: 2 },
      { label: 'Hold and wait', score: 4 },
      { label: 'Add more, it\'s a buying opportunity', score: 5 },
    ],
  },
  {
    code: 'C1-Q2', construct: 'C-1', constructName: 'Risk Tolerance', scale: '5-point-likert',
    question: 'Which return-and-volatility profile would you choose for a 10-year investment?',
    options: [
      { label: '8% guaranteed, no fluctuation (FD-like)', score: 1 },
      { label: '10% expected, ±5% in any year (debt-heavy hybrid)', score: 2 },
      { label: '12% expected, ±15% in any year (balanced)', score: 3 },
      { label: '14% expected, ±25% in any year (equity-heavy)', score: 4 },
      { label: '16% expected, ±40% in any year (aggressive)', score: 5 },
    ],
  },
  {
    code: 'C1-Q3', construct: 'C-1', constructName: 'Risk Tolerance', scale: '5-point-likert',
    question: 'Imagine a TV news anchor breathlessly reporting that the Sensex has fallen 12% in one day. Your first feeling is:',
    options: [
      { label: 'Strong fear; check my portfolio immediately', score: 1 },
      { label: 'Mild concern; will check tomorrow', score: 2 },
      { label: 'Neutral; the market goes up and down', score: 3 },
      { label: 'Mild curiosity; wonder if there\'s an opportunity', score: 4 },
      { label: 'Excitement; time to invest more', score: 5 },
    ],
  },
  {
    code: 'C1-Q4', construct: 'C-1', constructName: 'Risk Tolerance', scale: '5-point-likert',
    question: 'If your retirement corpus grew 40% over 5 years (against market 60%) OR lost 10% over 5 years (against market falling 25%), which outcome would feel better to you?',
    options: [
      { label: 'Grew 40% but lagged the market — somewhat disappointed', score: 3 },
      { label: 'Lost 10% but beat the falling market — relieved', score: 5 },
      { label: 'Both feel about the same to me', score: 4 },
    ],
  },
  {
    code: 'C1-Q5', construct: 'C-1', constructName: 'Risk Tolerance', scale: '5-point-likert',
    question: 'Compared with a typical FD return of 7%, what extra return per year would you require to put 50% of your money in equity for 10 years?',
    options: [
      { label: 'I would not, regardless of extra return', score: 1 },
      { label: 'At least 2 percentage points extra (≈9% total)', score: 2 },
      { label: 'At least 4 percentage points extra (≈11% total)', score: 3 },
      { label: 'At least 6 percentage points extra (≈13% total)', score: 4 },
      { label: 'Even 1 percentage point extra is enough — I trust equity long-term', score: 5 },
    ],
  },
  {
    code: 'C1-R1', construct: 'C-1', constructName: 'Risk Tolerance', scale: '5-point-likert',
    question: '"I would rather lose out on gains than risk any loss of my money."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },

  // ── C-2 Loss Aversion (higher = LESS loss-averse) ────────────────────
  {
    code: 'C2-Q1', construct: 'C-2', constructName: 'Loss Aversion', scale: '5-point-likert',
    question: 'Coin flip: heads, you gain ₹1 lakh. Tails, you lose ₹1 lakh. Do you take it?',
    options: [
      { label: 'Definitely yes', score: 5 },
      { label: 'Probably yes', score: 4 },
      { label: 'Unsure', score: 3 },
      { label: 'Probably no', score: 2 },
      { label: 'Definitely no', score: 1 },
    ],
  },
  {
    code: 'C2-Q2', construct: 'C-2', constructName: 'Loss Aversion', scale: '5-point-likert',
    question: 'Coin flip: heads, you gain ₹2 lakh. Tails, you lose ₹1 lakh. Do you take it?',
    options: [
      { label: 'Definitely yes', score: 5 },
      { label: 'Probably yes', score: 4 },
      { label: 'Unsure', score: 3 },
      { label: 'Probably no', score: 2 },
      { label: 'Definitely no — even with 2:1 odds in my favour', score: 1 },
    ],
  },
  {
    code: 'C2-Q3', construct: 'C-2', constructName: 'Loss Aversion', scale: '5-point-likert',
    question: 'Which feels worse to you?',
    options: [
      { label: 'Losing ₹50,000 on an investment I made', score: 1 },
      { label: 'Missing out on a ₹50,000 gain because I didn\'t invest', score: 5 },
      { label: 'They feel about the same', score: 3 },
    ],
  },
  {
    code: 'C2-Q4', construct: 'C-2', constructName: 'Loss Aversion', scale: '5-point-likert',
    question: '"A 30% loss in my portfolio would hurt me more than the same 30% gain would please me."',
    options: [
      { label: 'Strongly true (loss hurts much more)', score: 1 },
      { label: 'Mostly true', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Mostly false', score: 4 },
      { label: 'Strongly false (gain pleases me more)', score: 5 },
    ],
  },
  {
    code: 'C2-R1', construct: 'C-2', constructName: 'Loss Aversion', scale: '5-point-likert',
    question: '"Watching my portfolio drop by 20% would not affect my long-term plan."',
    options: [
      { label: 'Strongly agree', score: 5 },
      { label: 'Agree', score: 4 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 2 },
      { label: 'Strongly disagree', score: 1 },
    ],
  },

  // ── C-3 Time Preference (higher = longer horizon) ────────────────────
  {
    code: 'C3-Q1', construct: 'C-3', constructName: 'Time Preference', scale: '5-point-likert',
    question: 'Would you rather receive:',
    options: [
      { label: '₹50,000 today', score: 1 },
      { label: '₹52,000 in 6 months', score: 2 },
      { label: '₹58,000 in 12 months', score: 3 },
      { label: '₹70,000 in 24 months', score: 4 },
      { label: '₹1,00,000 in 5 years', score: 5 },
    ],
  },
  {
    code: 'C3-Q2', construct: 'C-3', constructName: 'Time Preference', scale: '5-point-likert',
    question: 'How do you feel about a goal that requires 15+ years of disciplined saving?',
    options: [
      { label: 'Overwhelming, I can\'t see that far', score: 1 },
      { label: 'Difficult but doable if reminders help', score: 3 },
      { label: 'Comfortable, I plan in long horizons', score: 5 },
    ],
  },
  {
    code: 'C3-Q3', construct: 'C-3', constructName: 'Time Preference', scale: '5-point-likert',
    question: 'If I cannot see visible progress in my portfolio every 3-6 months, I tend to:',
    options: [
      { label: 'Switch to a different investment', score: 1 },
      { label: 'Lose interest and stop checking', score: 2 },
      { label: 'Worry but stay invested', score: 3 },
      { label: 'Wait patiently, that\'s how investing works', score: 5 },
    ],
  },

  // ── C-4 Financial Self-Efficacy ──────────────────────────────────────
  {
    code: 'C4-Q1', construct: 'C-4', constructName: 'Financial Self-Efficacy', scale: '7-point-likert',
    question: '"I am confident I can plan and manage my own finances."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C4-Q2', construct: 'C-4', constructName: 'Financial Self-Efficacy', scale: '5-point-likert',
    question: 'When faced with an unexpected expense of ₹2 lakh, I:',
    options: [
      { label: 'Would not know what to do', score: 1 },
      { label: 'Would have to ask family for help', score: 2 },
      { label: 'Would take a personal loan', score: 3 },
      { label: 'Would manage by liquidating investments', score: 4 },
      { label: 'Have an emergency fund for exactly this', score: 5 },
    ],
  },
  {
    code: 'C4-Q3', construct: 'C-4', constructName: 'Financial Self-Efficacy', scale: '5-point-likert',
    question: 'I understand my own financial situation: my net worth, monthly cashflow, and what I owe.',
    options: [
      { label: 'Not at all', score: 1 },
      { label: 'Vaguely', score: 2 },
      { label: 'Somewhat', score: 3 },
      { label: 'Mostly', score: 4 },
      { label: 'Precisely', score: 5 },
    ],
  },
  {
    code: 'C4-R1', construct: 'C-4', constructName: 'Financial Self-Efficacy', scale: '5-point-likert',
    question: '"When it comes to my own finances, I often feel out of my depth."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },

  // ── C-5 Locus of Control (higher = internal) ─────────────────────────
  {
    code: 'C5-Q1', construct: 'C-5', constructName: 'Locus of Control', scale: '5-point-likert',
    question: 'Which is closer to your view?',
    options: [
      { label: 'My financial future depends mostly on luck, the economy, and circumstances I can\'t control', score: 1 },
      { label: 'It\'s roughly half and half', score: 3 },
      { label: 'My financial future depends mostly on the choices I make and the discipline I apply', score: 5 },
    ],
  },
  {
    code: 'C5-Q2', construct: 'C-5', constructName: 'Locus of Control', scale: '5-point-likert',
    question: 'When an investment goes badly, I most often think:',
    options: [
      { label: 'I was unlucky / it was the market', score: 1 },
      { label: 'My advisor / RM / friend gave me bad advice', score: 2 },
      { label: 'These things happen, hard to predict', score: 3 },
      { label: 'I should have researched more before deciding', score: 5 },
    ],
  },
  {
    code: 'C5-Q3', construct: 'C-5', constructName: 'Locus of Control', scale: '5-point-likert',
    question: 'If I could go back 10 years and change one financial decision, the decision I would change is something:',
    options: [
      { label: 'Someone else made for me', score: 1 },
      { label: 'Honestly, I can\'t think of anything', score: 3 },
      { label: 'I made and regret', score: 4 },
      { label: 'I didn\'t make but should have (e.g., starting a SIP earlier)', score: 5 },
    ],
  },

  // ── C-6 Money Avoidance (higher = more avoidant) ─────────────────────
  {
    code: 'C6-Q1', construct: 'C-6', constructName: 'Money Avoidance', scale: '7-point-likert',
    question: '"Rich people are greedy."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C6-Q2', construct: 'C-6', constructName: 'Money Avoidance', scale: '7-point-likert',
    question: '"Money corrupts people."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C6-Q3', construct: 'C-6', constructName: 'Money Avoidance', scale: '7-point-likert',
    question: '"I do not deserve a lot of money when others have less than me."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },

  // ── C-7 Money Worship ────────────────────────────────────────────────
  {
    code: 'C7-Q1', construct: 'C-7', constructName: 'Money Worship', scale: '7-point-likert',
    question: '"More money will make me happier."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C7-Q2', construct: 'C-7', constructName: 'Money Worship', scale: '7-point-likert',
    question: '"Most of life\'s problems can be solved with more money."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C7-Q3', construct: 'C-7', constructName: 'Money Worship', scale: '7-point-likert',
    question: '"You can never have enough money."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },

  // ── C-8 Money Status ─────────────────────────────────────────────────
  {
    code: 'C8-Q1', construct: 'C-8', constructName: 'Money Status', scale: '7-point-likert',
    question: '"Your self-worth is reflected in your net worth."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C8-Q2', construct: 'C-8', constructName: 'Money Status', scale: '7-point-likert',
    question: '"I feel inferior to people who earn more than I do."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C8-Q3', construct: 'C-8', constructName: 'Money Status', scale: '7-point-likert',
    question: '"It is important to drive a car that signals my success."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },

  // ── C-9 Money Vigilance ──────────────────────────────────────────────
  {
    code: 'C9-Q1', construct: 'C-9', constructName: 'Money Vigilance', scale: '7-point-likert',
    question: '"It is important to save for a rainy day."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C9-Q2', construct: 'C-9', constructName: 'Money Vigilance', scale: '7-point-likert',
    question: '"It is wrong to ask others how much money they earn or save."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C9-Q3', construct: 'C-9', constructName: 'Money Vigilance', scale: '7-point-likert',
    question: '"I would be embarrassed for others to know how much money I have."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Slightly disagree', score: 3 },
      { label: 'Neutral', score: 4 },
      { label: 'Slightly agree', score: 5 },
      { label: 'Agree', score: 6 },
      { label: 'Strongly agree', score: 7 },
    ],
  },

  // ── C-10 Mental Accounting (higher = more fungible/rational) ─────────
  {
    code: 'C10-Q1', construct: 'C-10', constructName: 'Mental Accounting', scale: '5-point-likert',
    question: 'You receive an unexpected ₹1 lakh bonus. You would most likely:',
    options: [
      { label: 'Use it for something special I have been wanting', score: 1 },
      { label: 'Save it in a separate "bonus" account', score: 3 },
      { label: 'Pay down a loan', score: 4 },
      { label: 'Treat it like any other money — same plan as my salary', score: 5 },
    ],
  },
  {
    code: 'C10-Q2', construct: 'C-10', constructName: 'Mental Accounting', scale: '5-point-likert',
    question: 'You have ₹3 lakh saved for your daughter\'s wedding (3 years away) and ₹3 lakh in your general savings. If the stock market is at a low and you want to invest, which money do you use?',
    options: [
      { label: 'Neither — stick to FDs for both', score: 1 },
      { label: 'Only the general savings — wedding money is sacred', score: 2 },
      { label: 'The wedding money — it has the longest horizon till need', score: 3 },
      { label: 'Both, equally — money is fungible', score: 5 },
    ],
  },
  {
    code: 'C10-Q3', construct: 'C-10', constructName: 'Mental Accounting', scale: '5-point-likert',
    question: '"Money earned through hard work feels different from money received as a gift or inheritance."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },

  // ── C-11 Herding / Social (higher = less susceptible) ────────────────
  {
    code: 'C11-Q1', construct: 'C-11', constructName: 'Herding / Social', scale: '5-point-likert',
    question: 'A close friend has made 35% in 6 months on a mid-cap fund. They tell you to invest. You:',
    options: [
      { label: 'Invest immediately, don\'t want to miss out', score: 1 },
      { label: 'Investigate but probably invest', score: 3 },
      { label: 'Feel envious but stick to my plan', score: 4 },
      { label: 'Investigate the fund\'s full track record first', score: 5 },
      { label: 'Ignore — past performance doesn\'t predict future', score: 5 },
    ],
  },
  {
    code: 'C11-Q2', construct: 'C-11', constructName: 'Herding / Social', scale: '5-point-likert',
    question: '"When most people I know are investing in something, it\'s usually a good sign that I should too."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },
  {
    code: 'C11-Q3', construct: 'C-11', constructName: 'Herding / Social', scale: '5-point-likert',
    question: 'A WhatsApp group you trust shares a "guaranteed multibagger" stock tip. You:',
    options: [
      { label: 'Buy some, the group has been right before', score: 1 },
      { label: 'Wait and see if the price actually rises before buying', score: 2 },
      { label: 'Research the stock independently first', score: 4 },
      { label: 'Ignore — guaranteed returns are illegal in India', score: 5 },
    ],
  },
  {
    code: 'C11-Q4', construct: 'C-11', constructName: 'Herding / Social', scale: '5-point-likert',
    question: '"Family or relatives significantly influence my investment decisions."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },
  {
    code: 'C11-Q5', construct: 'C-11', constructName: 'Herding / Social', scale: '5-point-likert',
    question: '"If I received a \'guaranteed 30% return\' tip in a family WhatsApp group, I would investigate it seriously."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },
  {
    code: 'C11-R1', construct: 'C-11', constructName: 'Herding / Social', scale: '5-point-likert',
    question: '"I would only invest in something AFTER personally researching it, regardless of who recommended it."',
    options: [
      { label: 'Strongly agree', score: 5 },
      { label: 'Agree', score: 4 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 2 },
      { label: 'Strongly disagree', score: 1 },
    ],
  },

  // ── C-12 Recency / Overconfidence (higher = less biased) ─────────────
  {
    code: 'C12-Q1', construct: 'C-12', constructName: 'Recency / Overconfidence', scale: '5-point-likert',
    question: 'Indian small-cap funds have delivered 25%+ returns over the last 3 years. What return should I expect from them in the next 3 years?',
    options: [
      { label: 'Similar — about 25%', score: 1 },
      { label: 'Slightly less — about 15-20%', score: 2 },
      { label: 'Less than long-term — they\'re due for a correction', score: 4 },
      { label: 'I don\'t try to predict', score: 4 },
      { label: 'Long-term average — about 12-14%', score: 5 },
    ],
  },
  {
    code: 'C12-Q2', construct: 'C-12', constructName: 'Recency / Overconfidence', scale: '5-point-likert',
    question: 'Compared to other Indian investors, how would you rate your investment knowledge?',
    options: [
      { label: 'Well above average', score: 1 },
      { label: 'Above average', score: 3 },
      { label: 'Well below average', score: 3 },
      { label: 'Below average', score: 4 },
      { label: 'Average', score: 5 },
    ],
  },
  {
    code: 'C12-Q3', construct: 'C-12', constructName: 'Recency / Overconfidence', scale: '5-point-likert',
    question: '"I can pick winning stocks or funds more reliably than most people."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 4 },
      { label: 'Disagree', score: 5 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },

  // ── C-13 Financial Literacy (knowledge MCQ; 0 or 1) ──────────────────
  {
    code: 'C13-Q1', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'If ₹1,00,000 is invested at 5% interest per year, how much will it be worth after 2 years?',
    options: [
      { label: 'More than ₹1,10,000', score: 1 },
      { label: 'Exactly ₹1,10,000', score: 0 },
      { label: 'Less than ₹1,10,000', score: 0 },
      { label: 'I don\'t know', score: 0 },
    ],
    correctIndex: 0,
  },
  {
    code: 'C13-Q2', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'If your savings earn 4% per year but inflation is 6% per year, after a year you can buy:',
    options: [
      { label: 'More than today', score: 0 },
      { label: 'Exactly the same as today', score: 0 },
      { label: 'Less than today', score: 1 },
      { label: 'I don\'t know', score: 0 },
    ],
    correctIndex: 2,
  },
  {
    code: 'C13-Q3', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: '"Buying a single company\'s stock usually provides safer returns than buying a stock mutual fund."',
    options: [
      { label: 'True', score: 0 },
      { label: 'False', score: 1 },
      { label: 'I don\'t know', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-Q4', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'Which of the following is currently tax-free at maturity in India?',
    options: [
      { label: 'Bank FD interest', score: 0 },
      { label: 'PPF maturity proceeds', score: 1 },
      { label: 'SCSS interest', score: 0 },
      { label: 'Senior Citizen FD interest', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-Q5', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'At age 60, what proportion of your NPS Tier I corpus can you withdraw as a tax-free lump sum?',
    options: [
      { label: '100%', score: 0 },
      { label: '60%', score: 1 },
      { label: '40%', score: 0 },
      { label: '0% — it must all become annuity', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-Q6', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'Long-term capital gains on equity mutual funds (held >12 months) are taxed at:',
    options: [
      { label: '0%', score: 0 },
      { label: '10% above ₹1 lakh (pre-2024 rate)', score: 0 },
      { label: '12.5% above ₹1.25 lakh', score: 1 },
      { label: 'Your income-tax slab rate', score: 0 },
    ],
    correctIndex: 2,
  },
  {
    code: 'C13-Q7', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'If a 65-year-old has no employer health cover and wants to buy a personal policy, what is most often true?',
    options: [
      { label: 'It will be cheaper than at age 55 because of senior discounts', score: 0 },
      { label: 'Premiums are significantly higher than at age 55 and pre-existing diseases have waiting periods', score: 1 },
      { label: 'Insurance companies cannot deny cover at any age', score: 0 },
      { label: 'Ayushman Bharat covers all senior citizens automatically', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-Q8', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'NPS Tier 1 and Tier 2 — which statement is correct?',
    options: [
      { label: 'Both have a 60-year lock-in', score: 0 },
      { label: 'Tier 1 is locked till 60 (with limited partial withdrawal); Tier 2 is fully liquid', score: 1 },
      { label: 'Tier 2 has tax benefits like Tier 1 for all subscribers', score: 0 },
      { label: 'Tier 2 is mandatory if you open Tier 1', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-Q9', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'EPF and EPS — which best describes the difference?',
    options: [
      { label: 'EPF and EPS are different names for the same fund', score: 0 },
      { label: 'EPF is the retirement corpus you withdraw; EPS funds the pension after age 58', score: 1 },
      { label: 'EPS is voluntary; EPF is mandatory', score: 0 },
      { label: 'EPS is only for government employees', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-Q10', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'PPF has a lock-in of:',
    options: [
      { label: '5 years, extendable in 1-year blocks', score: 0 },
      { label: '10 years, no extension allowed', score: 0 },
      { label: '15 years, extendable in 5-year blocks', score: 1 },
      { label: 'Until age 60', score: 0 },
    ],
    correctIndex: 2,
  },
  {
    code: 'C13-Q11', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'SCSS (Senior Citizen Savings Scheme) — which is true?',
    options: [
      { label: 'Open to anyone aged 50+', score: 0 },
      { label: 'Open to citizens aged 60+ (55+ for VRS retirees); rate is set by govt quarterly', score: 1 },
      { label: 'Interest rate is fixed for life at opening', score: 0 },
      { label: 'Interest is fully tax-free', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-D1', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'Can you receive a UPI request asking for money from someone you do not know?',
    options: [
      { label: 'No — you only receive money via simple UPI transfer', score: 0 },
      { label: 'Yes — and approving such a request causes money to leave your account', score: 1 },
      { label: 'Only after entering OTP', score: 0 },
      { label: 'Only for amounts above ₹5,000', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-D2', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'How would you verify whether a stock-tip app is a SEBI-registered intermediary?',
    options: [
      { label: 'Check the app rating on Play Store', score: 0 },
      { label: 'Check sebi.gov.in/Intermediaries portal for the registration number', score: 1 },
      { label: 'Check if the app has a green padlock', score: 0 },
      { label: 'Trust the app if many friends use it', score: 0 },
    ],
    correctIndex: 1,
  },
  {
    code: 'C13-D3', construct: 'C-13', constructName: 'Financial Literacy', scale: 'knowledge-mcq',
    question: 'A fake trading app typically has which combination of red flags?',
    options: [
      { label: 'Real-time market data and SEBI logo', score: 0 },
      { label: 'WhatsApp-only support, guaranteed-returns promise, no SEBI registration number, no nodal officer', score: 1 },
      { label: 'A free demo account', score: 0 },
      { label: 'A two-factor authentication step', score: 0 },
    ],
    correctIndex: 1,
  },

  // ── C-14 Scam Vulnerability (higher = LESS vulnerable) ───────────────
  {
    code: 'C14-Q1', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: 'You receive a call: "I am from your bank. Your account will be blocked in 2 hours unless you update your KYC. Please share the OTP I just sent you." You:',
    options: [
      { label: 'Share the OTP — the bank needs it', score: 1 },
      { label: 'Update via the SMS link they send me', score: 1 },
      { label: 'Ask for their employee ID and call the bank\'s main number to verify', score: 5 },
      { label: 'Hang up — banks never ask for OTPs', score: 5 },
    ],
  },
  {
    code: 'C14-Q2', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: '"I would feel uncomfortable refusing a financial offer from a relative or family friend, even if I was unsure."',
    options: [
      { label: 'Strongly agree', score: 1 },
      { label: 'Agree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 4 },
      { label: 'Strongly disagree', score: 5 },
    ],
  },
  {
    code: 'C14-Q3', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: 'An online offer promises 18% annual returns with capital fully guaranteed. The most likely truth is:',
    options: [
      { label: 'It is a legitimate, government-backed scheme I haven\'t heard of', score: 1 },
      { label: 'It is a small bank that needs deposits', score: 2 },
      { label: 'It is high-risk corporate paper', score: 3 },
      { label: 'It is mathematically impossible at current rates — likely a scam', score: 5 },
    ],
  },
  {
    code: 'C14-Q4', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: 'A friend sends you a UPI request claiming to refund ₹500 they owe you — to receive the money you need to approve the request. You:',
    options: [
      { label: 'Approve — it\'s a refund, not a payment', score: 1 },
      { label: 'Approve quickly so I don\'t miss it', score: 1 },
      { label: 'Ask them to send via simple UPI transfer instead', score: 5 },
      { label: 'Decline — receiving money never requires approving a request', score: 5 },
    ],
  },
  {
    code: 'C14-Q5', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: 'You get a call: "I am from CBI / Mumbai Police. Your Aadhaar is linked to a money-laundering case. You must transfer funds to a \'safe account\' for verification or face arrest." You:',
    options: [
      { label: 'Cooperate and transfer the amount they ask', score: 1 },
      { label: 'Stay on the call and follow instructions', score: 1 },
      { label: 'Hang up and call the local police station to verify', score: 5 },
      { label: 'Hang up — no police agency asks for transfers', score: 5 },
    ],
  },
  {
    code: 'C14-Q6', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: 'WhatsApp message from an unknown number: "We are SEBI. Your mutual fund flagged for tax issue. Pay ₹50,000 verification fee to avoid penalty." You:',
    options: [
      { label: 'Pay to avoid trouble', score: 1 },
      { label: 'Reply asking for details', score: 2 },
      { label: 'Check the SEBI Intermediaries portal yourself', score: 5 },
      { label: 'Ignore — SEBI never demands fees over WhatsApp', score: 5 },
    ],
  },
  {
    code: 'C14-Q7', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: 'At a small shop you notice a fresh-looking QR-code sticker stuck on top of the older printed one. You need to pay ₹2,000. You:',
    options: [
      { label: 'Scan the newer one — it must be the updated code', score: 1 },
      { label: 'Scan whichever is on top', score: 2 },
      { label: 'Ask the shopkeeper which is theirs', score: 4 },
      { label: 'Pay in cash or via a verified payee name only', score: 5 },
    ],
  },
  {
    code: 'C14-R1', construct: 'C-14', constructName: 'Scam Vulnerability', scale: '5-point-likert',
    question: '"Urgency in a phone call about my money makes me MORE suspicious, not more compliant."',
    options: [
      { label: 'Strongly agree', score: 5 },
      { label: 'Agree', score: 4 },
      { label: 'Neutral', score: 3 },
      { label: 'Disagree', score: 2 },
      { label: 'Strongly disagree', score: 1 },
    ],
  },

  // ── C-15 Family Money Dynamics ───────────────────────────────────────
  {
    code: 'C15-Q1', construct: 'C-15', constructName: 'Family Money Dynamics', scale: '5-point-likert',
    question: 'Major financial decisions in our household are typically made by:',
    options: [
      { label: 'Me alone', score: 3 },
      { label: 'My spouse alone', score: 2 },
      { label: 'Jointly with my spouse, after discussion', score: 5 },
      { label: 'Jointly with spouse and adult children', score: 5 },
      { label: 'Mostly by an external advisor / family elder / RM', score: 2 },
    ],
  },
  {
    code: 'C15-Q2', construct: 'C-15', constructName: 'Family Money Dynamics', scale: '5-point-likert',
    question: 'Does your spouse know roughly where all your investments, insurance policies, and important documents are?',
    options: [
      { label: 'Yes, fully', score: 5 },
      { label: 'Yes, mostly', score: 4 },
      { label: 'Some are shared, some are not', score: 3 },
      { label: 'No, mostly they don\'t know', score: 2 },
      { label: 'I am not married / single', score: 0 },
    ],
  },
  {
    code: 'C15-Q3', construct: 'C-15', constructName: 'Family Money Dynamics', scale: 'multi-select',
    question: 'Are there family members you currently support financially, or expect to support in the next 10 years? (Select all that apply)',
    options: [
      { label: 'Spouse who does not earn', score: 0 },
      { label: 'Adult child not yet financially independent', score: 0 },
      { label: 'Ageing parent(s)', score: 0 },
      { label: 'In-laws', score: 0 },
      { label: 'Sibling or other relative', score: 0 },
      { label: 'Adult child or relative with special needs', score: 0 },
      { label: 'None', score: 0 },
    ],
  },
  {
    code: 'C15-Q4', construct: 'C-15', constructName: 'Family Money Dynamics', scale: '5-point-likert',
    question: '"In our family, finances are discussed openly with my spouse / partner / trusted adult child."',
    options: [
      { label: 'Strongly disagree', score: 1 },
      { label: 'Disagree', score: 2 },
      { label: 'Neutral', score: 3 },
      { label: 'Agree', score: 4 },
      { label: 'Strongly agree', score: 5 },
    ],
  },

  // ── C-16 Future Time Perspective ─────────────────────────────────────
  {
    code: 'C16-Q1', construct: 'C-16', constructName: 'Future Time Perspective', scale: '7-point-likert',
    question: '"When I think about retirement, I can picture my daily life clearly."',
    options: [
      { label: '1 — Strongly disagree', score: 1 },
      { label: '2', score: 2 },
      { label: '3', score: 3 },
      { label: '4 — Neutral', score: 4 },
      { label: '5', score: 5 },
      { label: '6', score: 6 },
      { label: '7 — Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C16-Q2', construct: 'C-16', constructName: 'Future Time Perspective', scale: '7-point-likert',
    question: '"My future self feels like a real person whose wellbeing I care about."',
    options: [
      { label: '1 — Strongly disagree', score: 1 },
      { label: '2', score: 2 },
      { label: '3', score: 3 },
      { label: '4 — Neutral', score: 4 },
      { label: '5', score: 5 },
      { label: '6', score: 6 },
      { label: '7 — Strongly agree', score: 7 },
    ],
  },
  {
    code: 'C16-Q3', construct: 'C-16', constructName: 'Future Time Perspective', scale: '7-point-likert',
    question: '"Imagining myself at age 70 is something I rarely do." (reverse-coded)',
    options: [
      { label: '1 — Strongly disagree', score: 7 },
      { label: '2', score: 6 },
      { label: '3', score: 5 },
      { label: '4 — Neutral', score: 4 },
      { label: '5', score: 3 },
      { label: '6', score: 2 },
      { label: '7 — Strongly agree', score: 1 },
    ],
  },
]

export const PSYCH_BANK_BY_CODE: Record<string, PsychQuestion> = Object.fromEntries(
  PSYCH_QUESTIONS.map((q) => [q.code, q])
)

export const PSYCH_BANK_BY_CONSTRUCT: Record<string, PsychQuestion[]> = PSYCH_QUESTIONS.reduce(
  (acc, q) => {
    ;(acc[q.construct] ||= []).push(q)
    return acc
  },
  {} as Record<string, PsychQuestion[]>
)

export const PSYCH_TOTAL_ITEMS = PSYCH_QUESTIONS.length  // 74
