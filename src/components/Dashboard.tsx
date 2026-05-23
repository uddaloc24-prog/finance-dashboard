import { useState, lazy, Suspense, type ReactNode } from 'react'
import type { UserProfile, BucketState, ReturnAssumptions } from '../types'
import type { TabId } from '../constants'
import { totalCorpus, b1RunwayMonths } from '../lib/calculations'
import { useMarketData } from '../hooks/useMarketData'
import { BucketCard } from './BucketCard'
import { RefillAlert } from './RefillAlert'
import { Sliders } from './Sliders'
import { ProfileSettings } from './ProfileSettings'
import { DemographicsForm } from './DemographicsForm'
import { ExpenseEditor } from './ExpenseEditor'
import { InflationAssumptions } from './InflationAssumptions'
import { PlanSection } from './PlanSection'
import { SidePanel } from './ui/SidePanel'
import { CashflowSummary } from './CashflowSummary'
import { RetirementWelcome } from './RetirementWelcome'
import { AssetInventory } from './AssetInventory'
import { InsuranceCover } from './InsuranceCover'
import { LoansLiabilities } from './LoansLiabilities'
import { TabNav } from './TabNav'
import { TabNavFooter } from './TabNavFooter'
import { Button } from './ui/Button'
import { TAB_ITEMS } from '../constants'
import { storage } from '../lib/storage'
import { ExportMenu } from './ExportMenu'
import { InstallPrompt, OfflineBanner } from './InstallPrompt'

// Lazy-load heavy components (Recharts, AI)
const CorpusPreservation = lazy(() => import('./CorpusPreservation').then(m => ({ default: m.CorpusPreservation })))
const SWPSimulator = lazy(() => import('./SWPSimulator').then(m => ({ default: m.SWPSimulator })))
const YearSimulator = lazy(() => import('./YearSimulator').then(m => ({ default: m.YearSimulator })))
const AIPortfolioOptimizer = lazy(() => import('./AIPortfolioOptimizer').then(m => ({ default: m.AIPortfolioOptimizer })))
const StrategiesPanel = lazy(() => import('./strategies/StrategiesPanel').then(m => ({ default: m.StrategiesPanel })))
const ProfilesPanel = lazy(() => import('./profiles/ProfilesPanel').then(m => ({ default: m.ProfilesPanel })))
const MonteCarloPanel = lazy(() => import('./montecarlo/MonteCarloPanel').then(m => ({ default: m.MonteCarloPanel })))
const TaxPanel = lazy(() => import('./tax/TaxPanel').then(m => ({ default: m.TaxPanel })))
const BucketFundsExplorer = lazy(() => import('./buckets/BucketFundsExplorer').then(m => ({ default: m.BucketFundsExplorer })))
const InsightsPage = lazy(() => import('./InsightsPage').then(m => ({ default: m.InsightsPage })))
const HowToUsePage = lazy(() => import('./HowToUsePage').then(m => ({ default: m.HowToUsePage })))

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

interface Props {
  profile: UserProfile
  buckets: BucketState
  returnAssumptions: ReturnAssumptions
  onBucketsUpdate: (b: BucketState) => void
  onProfileUpdate: (p: UserProfile) => void
  onReturnsUpdate: (r: ReturnAssumptions) => void
  onReset: () => void
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'half-yearly': 'Half-Yearly',
  yearly: 'Yearly',
}

const INR = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const CR = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return INR(n)
}

export function Dashboard({
  profile,
  buckets,
  returnAssumptions,
  onBucketsUpdate,
  onProfileUpdate,
  onReturnsUpdate,
  onReset,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (!storage.getWelcomeSeen()) return 'welcome'
    if (!storage.getGuideSeen()) return 'guide'
    return 'plan'
  })
  const [openPlanStep, setOpenPlanStep] = useState<string | null>(null)
  const { data: marketData } = useMarketData(profile.refreshInterval)

  // Effective monthly draw nets passive income against withdrawal: only the
  // shortfall actually comes out of the corpus. When passive income meets or
  // exceeds the budget, the corpus draws nothing and the surplus deploys via
  // CashflowSummary's SIP/RD recommendation.
  const effectiveMonthlyDraw = Math.max(0, profile.monthlyWithdrawal - profile.sipAmount)
  const effectiveProfile: UserProfile = {
    ...profile,
    monthlyWithdrawal: effectiveMonthlyDraw,
    withdrawalAmount: effectiveMonthlyDraw,
  }

  const runway = b1RunwayMonths(buckets.b1, effectiveMonthlyDraw)
  const total = totalCorpus(buckets)


  const wr = ((effectiveMonthlyDraw * 12) / Math.max(1, total)) * 100
  const wrTone = wr <= 5 ? 'text-green-700' : wr <= 7 ? 'text-amber-700' : 'text-red-700'
  const runwayTone = runway < 6 ? 'text-red-700' : runway < 12 ? 'text-amber-700' : 'text-gray-900'

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Offline banner — only when navigator.onLine is false */}
      <OfflineBanner />

      {/* Persistent progress bar — flush at the very top */}
      <ProgressBar activeTab={activeTab} />

      {/* Compact sticky header — title + actions in one slim bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-semibold text-gray-900 text-sm tracking-tight truncate">
              <span className="hidden sm:inline">Retirement Planner</span>
              <UserGreeting />
            </h1>
            <StepLabel activeTab={activeTab} />
          </div>
          <div className="flex items-center gap-1">
            {activeTab !== 'insights' && (
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('insights')}>
                <span className="hidden sm:inline">Skip to insights</span>
                <span className="sm:hidden">Insights</span>
                <span className="ml-1" aria-hidden="true">→</span>
              </Button>
            )}
            <InstallPrompt />
            <ExportMenu profile={profile} buckets={buckets} returnAssumptions={returnAssumptions} variant="header" />
            <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
          </div>
        </div>
        {/* Dense KPI strip — 4 inline metrics computed on the NET draw
           (monthlyWithdrawal − sipAmount). When passive income covers the
           budget, the corpus draw is 0 and the WR / runway reflect that. */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 grid grid-cols-4 gap-4 text-center sm:text-left">
            <KpiCell label="Corpus" value={CR(total)} />
            <KpiCell
              label="Net monthly draw"
              value={INR(effectiveMonthlyDraw)}
              sub={
                profile.sipAmount > 0
                  ? `${INR(profile.monthlyWithdrawal)} − ${INR(profile.sipAmount)} income`
                  : profile.monthlyWithdrawal > 0
                    ? 'no passive income'
                    : undefined
              }
            />
            <KpiCell label="Withdrawal rate" value={`${wr.toFixed(2)}%`} valueClass={wrTone} sub="annual · net" />
            <KpiCell label="B1 runway" value={`${runway}mo`} valueClass={runwayTone} sub="on net draw" />
          </div>
        </div>
        {/* Tab nav — desktop pills inline; mobile renders a fixed bottom bar via TabNav internals */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5">
            <TabNav activeTab={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-3 space-y-3">
        {profile.sipAmount > 0 && (
          <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-xs text-teal-800 flex items-center justify-between">
            <span><strong>{FREQ_LABELS[profile.sipFrequency ?? 'monthly']} SIP/income:</strong> {INR(profile.sipAmount)}</span>
          </div>
        )}

        {/* Tab Content — only render the active tab */}
        {activeTab === 'insights' && (
          <div role="tabpanel" id="tabpanel-insights" aria-labelledby="tab-insights" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <InsightsPage
                profile={effectiveProfile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
                onBucketsUpdate={onBucketsUpdate}
                onProfileUpdate={onProfileUpdate}
                onReturnsUpdate={onReturnsUpdate}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'welcome' && (
          <div role="tabpanel" id="tabpanel-welcome" aria-labelledby="tab-welcome" className="space-y-3">
            <RetirementWelcome onStart={() => {
              storage.setWelcomeSeen(true)
              setActiveTab('plan')
            }} />
          </div>
        )}

        {activeTab === 'guide' && (
          <div role="tabpanel" id="tabpanel-guide" aria-labelledby="tab-guide" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <HowToUsePage onDone={(t) => {
                storage.setGuideSeen(true)
                setActiveTab(t as TabId)
              }} />
            </Suspense>
          </div>
        )}

        {activeTab === 'plan' && (
          <div role="tabpanel" id="tabpanel-plan" aria-labelledby="tab-plan" className="space-y-3">
            <PlanIntro />

            {/* Wheel + (optional) right-side panel. When a step is open the
                wheel column shrinks to the left and the side panel takes the
                right; when nothing is open the wheel is centred full-width. */}
            <PlanLayout
              openStep={openPlanStep}
              setOpenStep={setOpenPlanStep}
              profile={profile}
              buckets={buckets}
              onProfileUpdate={onProfileUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />

            {/* Step 04 — Profile & Settings — sits below the wheel as its own
                full-width section, just above the Cashflow Summary. */}
            <PlanSection
              num="04"
              tone="navy"
              title="Profile & Settings"
              subtitle="Corpus, tax bracket, withdrawal & SIP schedule"
              status={<ProfileStatus profile={profile} buckets={buckets} />}
              helpExamples={<HelpList items={HELP_PROFILE} />}
            >
              <ProfileSettings
                profile={profile}
                buckets={buckets}
                onProfileUpdate={onProfileUpdate}
                onBucketsUpdate={onBucketsUpdate}
                chrome="bare"
              />
            </PlanSection>
            {/* Legacy wheel render (kept hidden for reference) ─── */}
            {false && (
            <PlanWheel>
              <WheelStep idx={0}>
                <PlanSection
                  compact
                  num="01" tone="navy" icon="💼" shortTitle="Wealth" title="Wealth Snapshot"
                  subtitle="8 groups · 34 asset classes · Liquid drives calcs · Invested → passive income"
                  status={<AssetInventoryStatus profile={profile} />}
                  helpExamples={<HelpList items={HELP_WEALTH} />}
                >
                  <AssetInventory profile={profile} buckets={buckets} onProfileUpdate={onProfileUpdate} onBucketsUpdate={onBucketsUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
              <WheelStep idx={1}>
                <PlanSection
                  compact
                  num="02" tone="rose" icon="💳" shortTitle="Loans" title="Loans & Liabilities"
                  subtitle="4 groups · 13 loan types · MaxGain support · Avalanche / Snowball / MaxGain strategy"
                  status={<LoansStatus profile={profile} />}
                  helpExamples={<HelpList items={HELP_LOANS} />}
                >
                  <LoansLiabilities profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
              <WheelStep idx={2}>
                <PlanSection
                  compact
                  num="03" tone="green" icon="📊" shortTitle="Budget" title="Monthly Budget"
                  subtitle="Detailed breakdown — drives the monthly withdrawal"
                  status={<ExpensesStatus profile={profile} />}
                  helpExamples={<HelpList items={HELP_BUDGET} />}
                >
                  <ExpenseEditor profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
              <WheelStep idx={3}>
                <PlanSection
                  compact
                  num="04" tone="navy" icon="⚙️" shortTitle="Profile" title="Profile & Settings"
                  subtitle="Corpus, tax bracket, withdrawal & SIP schedule"
                  status={<ProfileStatus profile={profile} buckets={buckets} />}
                  helpExamples={<HelpList items={HELP_PROFILE} />}
                >
                  <ProfileSettings profile={profile} buckets={buckets} onProfileUpdate={onProfileUpdate} onBucketsUpdate={onBucketsUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
              <WheelStep idx={4}>
                <PlanSection
                  compact
                  num="05" tone="amber" icon="👥" shortTitle="Demographics" title="Demographics & Longevity"
                  subtitle="Current age, retirement age, life expectancy"
                  status={<DemographicsStatus profile={profile} />}
                  helpExamples={<HelpList items={HELP_DEMOGRAPHICS} />}
                >
                  <DemographicsForm profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
              <WheelStep idx={5}>
                <PlanSection
                  compact
                  num="06" tone="rose" icon="📈" shortTitle="Inflation" title="Inflation Assumptions"
                  subtitle="Split rates for general, healthcare, education"
                  status={<InflationStatus profile={profile} />}
                  helpExamples={<HelpList items={HELP_INFLATION} />}
                >
                  <InflationAssumptions profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
              <WheelStep idx={6}>
                <PlanSection
                  compact
                  num="07" tone="rose" icon="🛡️" shortTitle="Insurance" title="Insurance Cover"
                  subtitle="3 groups · 14 policy types · health · life · risk cover · MWP Act flag for term"
                  status={<InsuranceStatus profile={profile} />}
                  helpExamples={<HelpList items={HELP_INSURANCE} />}
                >
                  <InsuranceCover profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" />
                </PlanSection>
              </WheelStep>
            </PlanWheel>
            )}

            {/* (the legacy grid layout below is retired — kept commented for reference)
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-start" hidden>
              <PlanSection
                num="01"
                tone="navy"
                title="Wealth Snapshot"
                subtitle="8 groups · 34 asset classes · Liquid drives calcs · Invested → passive income"
                status={<AssetInventoryStatus profile={profile} />}
                helpExamples={<HelpList items={HELP_WEALTH} />}
              >
                <AssetInventory
                  profile={profile}
                  buckets={buckets}
                  onProfileUpdate={onProfileUpdate}
                  onBucketsUpdate={onBucketsUpdate}
                  chrome="bare"
                />
              </PlanSection>

              <PlanSection
                num="02"
                tone="rose"
                title="Loans & Liabilities"
                subtitle="4 groups · 13 loan types · MaxGain support · Avalanche / Snowball / MaxGain strategy"
                status={<LoansStatus profile={profile} />}
                helpExamples={<HelpList items={HELP_LOANS} />}
              >
                <LoansLiabilities
                  profile={profile}
                  onProfileUpdate={onProfileUpdate}
                  chrome="bare"
                />
              </PlanSection>

              <PlanSection
                num="03"
                tone="green"
                title="Monthly Budget"
                subtitle="Detailed breakdown — drives the monthly withdrawal"
                status={<ExpensesStatus profile={profile} />}
                helpExamples={<HelpList items={HELP_BUDGET} />}
              >
                <ExpenseEditor
                  profile={profile}
                  onProfileUpdate={onProfileUpdate}
                  chrome="bare"
                />
              </PlanSection>

              <PlanSection
                num="04"
                tone="navy"
                title="Profile & Settings"
                subtitle="Corpus, tax bracket, withdrawal & SIP schedule"
                status={<ProfileStatus profile={profile} buckets={buckets} />}
                helpExamples={<HelpList items={HELP_PROFILE} />}
              >
                <ProfileSettings
                  profile={profile}
                  buckets={buckets}
                  onProfileUpdate={onProfileUpdate}
                  onBucketsUpdate={onBucketsUpdate}
                  chrome="bare"
                />
              </PlanSection>

              <PlanSection
                num="05"
                tone="amber"
                title="Demographics & Longevity"
                subtitle="Current age, retirement age, life expectancy"
                status={<DemographicsStatus profile={profile} />}
                helpExamples={<HelpList items={HELP_DEMOGRAPHICS} />}
              >
                <DemographicsForm
                  profile={profile}
                  onProfileUpdate={onProfileUpdate}
                  chrome="bare"
                />
              </PlanSection>

              <PlanSection
                num="06"
                tone="rose"
                title="Inflation Assumptions"
                subtitle="Split rates for general, healthcare, education"
                status={<InflationStatus profile={profile} />}
                helpExamples={<HelpList items={HELP_INFLATION} />}
              >
                <InflationAssumptions
                  profile={profile}
                  onProfileUpdate={onProfileUpdate}
                  chrome="bare"
                />
              </PlanSection>

              <PlanSection
                num="07"
                tone="rose"
                title="Insurance Cover"
                subtitle="3 groups · 14 policy types · health · life · risk cover · MWP Act flag for term"
                status={<InsuranceStatus profile={profile} />}
                helpExamples={<HelpList items={HELP_INSURANCE} />}
              >
                <InsuranceCover
                  profile={profile}
                  onProfileUpdate={onProfileUpdate}
                  chrome="bare"
                />
              </PlanSection>
            </div>
            */}

            {/* Cashflow summary — single column, full-width footer */}
            <CashflowSummary profile={profile} buckets={buckets} />
          </div>
        )}

        {activeTab === 'assets' && (
          <div role="tabpanel" id="tabpanel-assets" aria-labelledby="tab-assets" className="space-y-3">
            {/* Refill alerts */}
            <RefillAlert
              buckets={buckets}
              monthlyWithdrawal={effectiveMonthlyDraw}
              returnAssumptions={returnAssumptions}
              onBucketsUpdate={onBucketsUpdate}
            />

            {/* Buckets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BucketCard id="b1" value={buckets.b1} total={total} returnAssumption={returnAssumptions.b1} runway={runway} />
              <BucketCard id="b2" value={buckets.b2} total={total} returnAssumption={returnAssumptions.b2} />
              <BucketCard id="b3" value={buckets.b3} total={total} returnAssumption={returnAssumptions.b3} />
              <BucketCard id="b4" value={buckets.b4} total={total} returnAssumption={returnAssumptions.b4} />
            </div>

            {/* Sliders */}
            <Sliders
              profile={profile}
              buckets={buckets}
              returnAssumptions={returnAssumptions}
              onProfileChange={onProfileUpdate}
              onReturnsChange={onReturnsUpdate}
              onBucketsUpdate={onBucketsUpdate}
            />
          </div>
        )}

        {activeTab === 'explorer' && (
          <div role="tabpanel" id="tabpanel-explorer" aria-labelledby="tab-explorer" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <BucketFundsExplorer bucketValues={buckets} />
            </Suspense>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div role="tabpanel" id="tabpanel-profiles" aria-labelledby="tab-profiles" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <ProfilesPanel
                userProfile={profile}
                buckets={buckets}
                onProfileUpdate={onProfileUpdate}
                onBucketsUpdate={onBucketsUpdate}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'strategies' && (
          <div role="tabpanel" id="tabpanel-strategies" aria-labelledby="tab-strategies" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <StrategiesPanel
                profile={effectiveProfile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div role="tabpanel" id="tabpanel-simulate" aria-labelledby="tab-simulate" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <CorpusPreservation
                profile={effectiveProfile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
              <MonteCarloPanel
                profile={effectiveProfile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
              <YearSimulator
                buckets={buckets}
                monthlyWithdrawal={effectiveMonthlyDraw}
                inflationRate={profile.inflationRate}
                returnAssumptions={returnAssumptions}
              />
              <SWPSimulator
                buckets={buckets}
                monthlyWithdrawal={effectiveMonthlyDraw}
                inflationRate={profile.inflationRate}
                returnAssumptions={returnAssumptions}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'tax' && (
          <div role="tabpanel" id="tabpanel-tax" aria-labelledby="tab-tax" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <TaxPanel
                profile={effectiveProfile}
                buckets={buckets}
                returnAssumptions={returnAssumptions}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'ai' && (
          <div role="tabpanel" id="tabpanel-ai" aria-labelledby="tab-ai" className="space-y-3">
            <Suspense fallback={<TabLoading />}>
              <AIPortfolioOptimizer
                profile={effectiveProfile}
                buckets={buckets}
                marketData={marketData}
                onReturnsUpdate={onReturnsUpdate}
              />
            </Suspense>
          </div>
        )}

        {/* Step navigation — Previous / Next between tabs */}
        <TabNavFooter activeTab={activeTab} onChange={setActiveTab} />
      </main>
    </div>
  )
}

// ── PlanLayout — wheel + right-side panel (Plan tab) ──────────────────
// When openStep is null the wheel takes the full width. When a step is
// open the wheel shrinks to ~40% on the left and a SidePanel renders on
// the right with the active step's editor + Save & Exit footer.

interface PlanStepConfig {
  num: string
  tone: 'navy' | 'rose' | 'green' | 'amber'
  shortTitle: string
  title: string
  subtitle: string
  icon: string
  status: ReactNode
  helpExamples: ReactNode
  editor: ReactNode
}

interface PlanLayoutProps {
  openStep: string | null
  setOpenStep: (n: string | null) => void
  profile: UserProfile
  buckets: BucketState
  onProfileUpdate: (p: UserProfile) => void
  onBucketsUpdate: (b: BucketState) => void
}

function PlanLayout({ openStep, setOpenStep, profile, buckets, onProfileUpdate, onBucketsUpdate }: PlanLayoutProps) {
  // Six wheel steps; Profile & Settings (04) is intentionally NOT in the
  // wheel — it renders as a standalone full-width card below the wheel,
  // just above the Cashflow Summary.
  const steps: PlanStepConfig[] = [
    { num: '01', tone: 'navy',  shortTitle: 'Wealth',       title: 'Wealth Snapshot',         subtitle: '8 groups · 34 asset classes · Liquid drives calcs · Invested → passive income', icon: '💼', status: <AssetInventoryStatus profile={profile} />, helpExamples: <HelpList items={HELP_WEALTH} />,        editor: <AssetInventory profile={profile} buckets={buckets} onProfileUpdate={onProfileUpdate} onBucketsUpdate={onBucketsUpdate} chrome="bare" /> },
    { num: '02', tone: 'rose',  shortTitle: 'Loans',        title: 'Loans & Liabilities',     subtitle: '4 groups · 13 loan types · MaxGain support · Avalanche / Snowball / MaxGain strategy', icon: '💳', status: <LoansStatus profile={profile} />,           helpExamples: <HelpList items={HELP_LOANS} />,         editor: <LoansLiabilities profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" /> },
    { num: '03', tone: 'green', shortTitle: 'Budget',       title: 'Monthly Budget',          subtitle: 'Detailed breakdown — drives the monthly withdrawal', icon: '📊', status: <ExpensesStatus profile={profile} />,             helpExamples: <HelpList items={HELP_BUDGET} />,        editor: <ExpenseEditor profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" /> },
    { num: '05', tone: 'amber', shortTitle: 'Demographics', title: 'Demographics & Longevity', subtitle: 'Current age, retirement age, life expectancy', icon: '👥', status: <DemographicsStatus profile={profile} />,        helpExamples: <HelpList items={HELP_DEMOGRAPHICS} />,  editor: <DemographicsForm profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" /> },
    { num: '06', tone: 'rose',  shortTitle: 'Inflation',    title: 'Inflation Assumptions',   subtitle: 'Split rates for general, healthcare, education', icon: '📈', status: <InflationStatus profile={profile} />,             helpExamples: <HelpList items={HELP_INFLATION} />,     editor: <InflationAssumptions profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" /> },
    { num: '07', tone: 'rose',  shortTitle: 'Insurance',    title: 'Insurance Cover',         subtitle: '3 groups · 14 policy types · health · life · risk cover · MWP Act flag for term', icon: '🛡️', status: <InsuranceStatus profile={profile} />,           helpExamples: <HelpList items={HELP_INSURANCE} />,     editor: <InsuranceCover profile={profile} onProfileUpdate={onProfileUpdate} chrome="bare" /> },
  ]
  const active = steps.find((s) => s.num === openStep) ?? null
  const TONE_TO_ACCENT = { navy: 'navy', rose: 'rose', green: 'emerald', amber: 'amber' } as const

  // When a step is open: wheel shrinks to a narrow left rail and the side
  // panel takes the larger right column with enough room for the asset-row
  // 5-col grid to render at full width without wrapping.
  return (
    <div className={active
      ? 'grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_minmax(720px,1fr)] gap-4 items-start'
      : ''}
    >
      {/* Wheel column — auto-shrinks badges + radius when active */}
      <div className={active ? 'xl:max-w-[360px] mx-auto w-full' : ''}>
        <PlanWheel compact={!!active}>
          {steps.map((s, i) => (
            <WheelStep key={s.num} idx={i} radius={active ? 120 : 230}>
              <PlanSection
                compact
                external
                size={active ? 'sm' : 'md'}
                active={openStep === s.num}
                open={openStep === s.num}
                onToggle={() => setOpenStep(openStep === s.num ? null : s.num)}
                num={s.num} tone={s.tone} icon={s.icon} shortTitle={s.shortTitle} title={s.title}
                subtitle={s.subtitle} status={s.status} helpExamples={s.helpExamples}
              >
                {/* children unused in external mode */}
                <></>
              </PlanSection>
            </WheelStep>
          ))}
        </PlanWheel>
      </div>

      {/* Right-side panel */}
      {active && (
        <SidePanel
          num={active.num}
          title={active.title}
          subtitle={active.subtitle}
          accent={TONE_TO_ACCENT[active.tone]}
          helpExamples={active.helpExamples}
          onClose={() => setOpenStep(null)}
        >
          {active.editor}
        </SidePanel>
      )}
    </div>
  )
}

// ── PlanWheel — circular layout for the seven Plan steps ──────────────

/** Number of steps in the wheel — used for angle math. Profile lives outside the wheel. */
const PLAN_WHEEL_COUNT = 6

function angleToXY(idx: number, total: number, radius: number): { x: number; y: number } {
  // Start at 12 o'clock and go clockwise.
  const angle = (idx / total) * 2 * Math.PI - Math.PI / 2
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
}

function PlanWheel({ children, compact }: { children: ReactNode; compact?: boolean }) {
  const maxW = compact ? 360 : 680
  return (
    <>
      {/* Desktop: circular layout */}
      <div className="hidden md:block relative w-full aspect-square mx-auto my-2" style={{ maxWidth: `${maxW}px` }}>
        {/* Decorative outer ring */}
        <div className="absolute inset-[14%] rounded-full border-2 border-dashed border-slate-200" aria-hidden="true" />
        {/* Center wordmark — shrinks in compact mode */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          {compact ? (
            <>
              <span className="font-serif italic text-base font-extralight text-slate-700">your plan</span>
              <span className="font-serif text-xl font-extrabold tracking-tight text-slate-900">7 steps</span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700">Step 1 · Plan</span>
              <span className="font-serif italic text-2xl sm:text-3xl font-extralight text-slate-800 mt-1">your plan</span>
              <span className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-1">7 steps</span>
              <span className="text-[10px] text-slate-500 italic mt-1">click any badge to open</span>
            </>
          )}
        </div>
        {children}
      </div>
      {/* Mobile: 2-col grid fallback */}
      <div className="md:hidden grid grid-cols-2 gap-3 justify-items-center">
        {children}
      </div>
    </>
  )
}

function WheelStep({ idx, children, radius = 230 }: { idx: number; children: ReactNode; radius?: number }) {
  const { x, y } = angleToXY(idx, PLAN_WHEEL_COUNT, radius)
  return (
    <>
      {/* Desktop absolute position */}
      <div
        className="hidden md:block absolute"
        style={{ left: '50%', top: '50%', transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` }}
      >
        {children}
      </div>
      {/* Mobile: in-flow */}
      <div className="md:hidden">
        {children}
      </div>
    </>
  )
}

// ── Plan-step example content ─────────────────────────────────────────
// Concise example entries shown inside the "Show example entries" panel
// at the top of each Plan-step modal. Keep each item one-line.

interface HelpItem { label: string; value: string; note?: string }

const HELP_WEALTH: HelpItem[] = [
  { label: 'Bank FD',              value: '₹2,00,000',     note: 'Liquid · ~₹1,400/mo interest if held' },
  { label: 'Mutual Funds (mixed)', value: '₹12,50,000',    note: 'Invested · 0/mo (no SWP yet)' },
  { label: 'SCSS (senior)',        value: '₹15,00,000',    note: 'Liquid · ~₹10,250/mo quarterly payout' },
  { label: 'PPF',                  value: '₹8,00,000',     note: 'Invested · compounds annually, no income' },
  { label: 'Stocks (Indian)',      value: '₹5,50,000',     note: 'Liquid · 0/mo (no dividend stream)' },
  { label: 'Self-occupied home',   value: '₹85,00,000',    note: 'Invested · market value · 0/mo' },
  { label: 'Rental property',      value: '₹50,00,000',    note: 'Invested · ₹18,000/mo rent' },
  { label: 'Physical gold',        value: '₹6,00,000',     note: 'Liquid · 0/mo' },
]

const HELP_LOANS: HelpItem[] = [
  { label: 'Home loan',     value: '₹35,00,000 outstanding', note: '8.5% · ₹32,000 EMI · MaxGain flag for HDFC/SBI overdraft variant' },
  { label: 'Car loan',      value: '₹3,50,000',              note: '9.5% · ₹6,000 EMI · ~5 years left' },
  { label: 'Credit card',   value: '₹85,000',                note: '36–42% · pay in full to avoid' },
  { label: 'Personal loan', value: '₹0 (inactive)',          note: 'Mark Active = off when fully paid' },
  { label: 'Strategy',      value: 'Avalanche',              note: 'Pay highest-rate first (saves most interest)' },
]

const HELP_BUDGET: HelpItem[] = [
  { label: 'Rent / EMI',          value: '₹25,000 · monthly',     note: 'Essential — biggest line item for most' },
  { label: 'Food & Groceries',    value: '₹15,000 · monthly',     note: 'Essential' },
  { label: 'Utilities',           value: '₹4,500 · monthly',      note: 'Electricity + internet + gas combined' },
  { label: 'Health premium',      value: '₹35,000 · yearly',      note: '≈ ₹2,917/mo equivalent — auto-converted' },
  { label: 'Travel (vacations)',  value: '₹1,50,000 · yearly',    note: '≈ ₹12,500/mo equivalent' },
  { label: 'Tuition / coaching',  value: '₹50,000 · quarterly',   note: '≈ ₹16,667/mo equivalent' },
]

const HELP_PROFILE: HelpItem[] = [
  { label: 'Corpus',              value: '₹1.25 Cr',        note: 'Total investable retirement corpus' },
  { label: 'Monthly withdrawal',  value: '₹60,000',         note: 'Net of any SIP/passive income — see Budget' },
  { label: 'SIP (passive income)', value: '₹0 (retired)',   note: 'Non-zero only if you have ongoing rental / dividend' },
  { label: 'Tax bracket',         value: '20% slab',        note: '0% (rebated) / 5% / 20% / 30%' },
  { label: 'Inflation',           value: '6.5%',            note: 'Default — Step 06 splits into general / health / education' },
]

const HELP_DEMOGRAPHICS: HelpItem[] = [
  { label: 'Current age',       value: '58',           note: 'Today' },
  { label: 'Retirement age',    value: '62',           note: 'When the plan starts drawing from corpus' },
  { label: 'Life expectancy',   value: '88',           note: 'Conservative for Indian context — plan to 90 is safer' },
  { label: 'Spouse age',        value: '55 (optional)', note: 'Used for joint-longevity planning' },
  { label: 'City tier',         value: 'Metro',        note: 'Drives the cost-of-living overlay' },
]

const HELP_INFLATION: HelpItem[] = [
  { label: 'General inflation', value: '6%',  note: 'Indian long-term average (RBI target band ~4 ± 2%)' },
  { label: 'Healthcare',        value: '10%', note: 'Premiums + treatment costs rise faster than CPI' },
  { label: 'Education',         value: '12%', note: 'For grand-/children\'s tuition; can override down if uninvolved' },
  { label: 'Conservative tilt', value: '+1% each', note: 'Recommended when in doubt — better to over-prepare' },
]

const HELP_INSURANCE: HelpItem[] = [
  { label: 'Family floater',     value: 'Cover ₹15 L · Premium ₹35,000/yr · Active', note: 'Base health policy for the household' },
  { label: 'Super top-up',       value: 'Cover ₹50 L · Premium ₹15,000/yr · Active', note: 'Stacks on top of base; high-deductible' },
  { label: 'Term plan',          value: 'Cover ₹2 Cr · Premium ₹25,000/yr · MWP ✓', note: 'MWP Act keeps proceeds creditor-safe' },
  { label: 'Critical illness',   value: 'Cover ₹25 L · Premium ₹18,000/yr',         note: 'Lump sum on diagnosis' },
  { label: 'Personal accident',  value: 'Cover ₹50 L · Premium ₹6,000/yr',          note: 'Disability + accidental death' },
]

function HelpList({ items }: { items: HelpItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,2.5fr)] gap-3 items-baseline">
          <span className="font-bold text-slate-900">{it.label}</span>
          <span className="font-mono font-bold tabular-nums text-slate-900">{it.value}</span>
          {it.note && <span className="text-slate-600 italic">{it.note}</span>}
        </li>
      ))}
      <li className="pt-2 mt-1 border-t border-slate-200/70 text-[11px] font-medium text-slate-500 italic">
        Numbers are illustrative — replace with your own values; entries you don't have can stay blank.
      </li>
    </ul>
  )
}

function PlanIntro() {
  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[10px] font-bold tracking-[3px] uppercase text-amber-700 tabular-nums">Step 1 · Plan</span>
        <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-tight text-slate-900 leading-tight">
        Set up <em className="not-italic font-extrabold text-blue-700">your plan</em>.
      </h2>
      <p className="text-[11px] sm:text-xs text-slate-600 mt-1.5 leading-snug max-w-2xl">
        Four numbered subsections. Tap any header to expand or collapse. Inputs save automatically as you type — every chart and recommendation downstream flows from these numbers.
      </p>
    </div>
  )
}

function ProfileStatus({ profile, buckets }: { profile: UserProfile; buckets: BucketState }) {
  const c = totalCorpus(buckets)
  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Corpus</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">{CR(c)}</div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">Tax {profile.taxBracket}%</div>
    </div>
  )
}

function DemographicsStatus({ profile }: { profile: UserProfile }) {
  const demo = profile.demographics
  if (!demo) return null
  const isRetired = demo.currentAge >= demo.retirementAge
  const yrs = Math.max(0, demo.retirementAge - demo.currentAge)
  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">
        {isRetired ? 'Retired' : 'To retire'}
      </div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
        {isRetired ? `Age ${demo.currentAge}` : `${yrs} yrs`}
      </div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">
        Horizon {Math.max(0, demo.lifeExpectancy - demo.currentAge)}y
      </div>
    </div>
  )
}

function LoansStatus({ profile }: { profile: UserProfile }) {
  const lp = profile.loanProfile
  if (!lp) {
    return (
      <div className="text-right">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Outstanding</div>
        <div className="text-sm font-bold text-slate-400 tabular-nums leading-tight">—</div>
        <div className="text-[10px] text-slate-500 tabular-nums leading-tight">no loans entered</div>
      </div>
    )
  }
  let outstanding = 0, emi = 0, active = 0
  for (const [k, v] of Object.entries(lp)) {
    if (k === 'strategy' || !v || typeof v !== 'object') continue
    const obj = v as { active?: boolean; outstanding?: number; emi?: number }
    if (obj.active) {
      active += 1
      outstanding += obj.outstanding || 0
      emi += obj.emi || 0
    }
  }
  if (active === 0) {
    return (
      <div className="text-right">
        <div className="text-[10px] text-emerald-700 uppercase tracking-wide leading-none font-bold">Debt-free</div>
        <div className="text-sm font-bold text-emerald-700 tabular-nums leading-tight">✓ ₹0</div>
        <div className="text-[10px] text-slate-500 tabular-nums leading-tight">protect this milestone</div>
      </div>
    )
  }
  return (
    <div className="text-right">
      <div className="text-[10px] text-rose-700 uppercase tracking-wide leading-none font-bold">Outstanding</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">{CR(outstanding)}</div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">
        {active} loan{active === 1 ? '' : 's'} · {INR(emi)}/mo EMI
      </div>
    </div>
  )
}

function InsuranceStatus({ profile }: { profile: UserProfile }) {
  const ic = profile.insuranceCover
  if (!ic) {
    return (
      <div className="text-right">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Cover</div>
        <div className="text-sm font-bold text-slate-400 tabular-nums leading-tight">—</div>
        <div className="text-[10px] text-slate-500 tabular-nums leading-tight">no policies entered</div>
      </div>
    )
  }
  let totalCover = 0, totalPremium = 0, active = 0
  for (const e of Object.values(ic)) {
    if (!e || typeof e !== 'object') continue
    const obj = e as { active?: boolean; cover?: number; premium?: number }
    if (obj.active) {
      active += 1
      totalCover += obj.cover || 0
      totalPremium += obj.premium || 0
    }
  }
  if (active === 0) {
    return (
      <div className="text-right">
        <div className="text-[10px] text-rose-700 uppercase tracking-wide leading-none font-bold">No active cover</div>
        <div className="text-sm font-bold text-slate-400 tabular-nums leading-tight">—</div>
        <div className="text-[10px] text-rose-600 tabular-nums leading-tight">activate at least one</div>
      </div>
    )
  }
  return (
    <div className="text-right">
      <div className="text-[10px] text-rose-700 uppercase tracking-wide leading-none font-bold">Active cover</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">{CR(totalCover)}</div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">
        {active} policies · {INR(totalPremium)}/yr
      </div>
    </div>
  )
}

function AssetInventoryStatus({ profile }: { profile: UserProfile }) {
  const inv = profile.assetInventory
  if (!inv) {
    return (
      <div className="text-right">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Liquid Corpus</div>
        <div className="text-sm font-bold text-slate-400 tabular-nums leading-tight">—</div>
        <div className="text-[10px] text-slate-500 tabular-nums leading-tight">enter wealth</div>
      </div>
    )
  }
  let total = 0, liquid = 0, passive = 0
  for (const e of Object.values(inv)) {
    if (!e || typeof e !== 'object') continue
    const obj = e as { amount?: number; status?: string; monthlyIncome?: number }
    const amount = obj.amount || 0
    total += amount
    if (obj.status === 'liquid' || obj.status === 'liquidate') {
      liquid += amount
    } else {
      passive += obj.monthlyIncome || 0
    }
  }
  return (
    <div className="text-right">
      <div className="text-[10px] text-emerald-700 uppercase tracking-wide leading-none font-bold">Liquid Corpus</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">{CR(liquid)}</div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">
        Invested {CR(total - liquid)} · Passive {CR(passive)}/mo
      </div>
    </div>
  )
}

function ExpensesStatus({ profile }: { profile: UserProfile }) {
  const e = profile.expenses
  if (!e) return null
  const total = e.essential + e.lifestyle + e.healthcare + e.education
  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Per month</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">{INR(total)}</div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">{INR(total * 12)}/yr</div>
    </div>
  )
}

function InflationStatus({ profile }: { profile: UserProfile }) {
  const e = profile.expenses
  if (!e) return null
  return (
    <div className="text-right">
      <div className="text-[10px] text-slate-400 uppercase tracking-wide leading-none">Annual</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums leading-tight">
        {e.generalInflation}% / {e.healthcareInflation}% / {e.educationInflation}%
      </div>
      <div className="text-[10px] text-slate-500 tabular-nums leading-tight">Gen · Health · Edu</div>
    </div>
  )
}

function UserGreeting() {
  const id = storage.getIdentity()
  const first = id?.fullName?.trim().split(/\s+/)[0]
  if (!first || first === 'Anonymous') return null
  return (
    <span className="text-slate-500 font-normal hidden md:inline">
      <span className="hidden sm:inline mx-1.5 text-slate-300">·</span>
      {first}'s plan
    </span>
  )
}

function ProgressBar({ activeTab }: { activeTab: TabId }) {
  const idx = TAB_ITEMS.findIndex((t) => t.id === activeTab)
  const pct = ((idx + 1) / TAB_ITEMS.length) * 100
  return (
    <div
      className="h-1 bg-slate-200/60 sticky top-0 z-30"
      role="progressbar"
      aria-valuenow={idx + 1}
      aria-valuemin={1}
      aria-valuemax={TAB_ITEMS.length}
      aria-label={`Step ${idx + 1} of ${TAB_ITEMS.length}`}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StepLabel({ activeTab }: { activeTab: TabId }) {
  const idx = TAB_ITEMS.findIndex((t) => t.id === activeTab)
  const tab = TAB_ITEMS[idx]
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500 border-l border-slate-200 pl-3">
      <span className="font-medium text-slate-700 tabular-nums">{idx + 1}/{TAB_ITEMS.length}</span>
      <span className="text-slate-400">·</span>
      <span>{tab?.label ?? ''}</span>
    </span>
  )
}

function KpiCell({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">{label}</div>
      <div className={`text-base sm:text-lg font-semibold tabular-nums truncate ${valueClass ?? 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 tabular-nums">{sub}</div>}
    </div>
  )
}
