'use client';

import { useState, useEffect } from 'react';
import { HealingForecast } from '@/components/predictions';

// Mock user subscription status - replace with actual auth/subscription check
interface UserSubscription {
  isPremium: boolean;
  lastPredictionUpdate: Date | null;
  nextUpdateAvailable: Date | null;
}

// Hook that returns subscription data - time values are set via useEffect to avoid hydration mismatch
function useUserSubscription(): UserSubscription & { isHydrated: boolean } {
  const [isHydrated, setIsHydrated] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription>({
    isPremium: false,
    lastPredictionUpdate: null,
    nextUpdateAvailable: null,
  });

  useEffect(() => {
    // Set time-based values only on client side to avoid hydration mismatch
    setSubscription({
      isPremium: false, // Change to true to test premium features
      lastPredictionUpdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      nextUpdateAvailable: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now for free
    });
    setIsHydrated(true);
  }, []);

  return { ...subscription, isHydrated };
}

function formatTimeUntil(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return 'now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function HowItWorksModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">How Predictions Work</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Cohort Matching
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              We analyze your profile, emotional patterns, and breakup context to find others who&apos;ve had similar experiences.
              Your &quot;cohort&quot; consists of people with comparable relationship length, attachment style, and recovery patterns.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Statistical Analysis
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Using Kaplan-Meier survival analysis (a method used in medical research), we calculate the probability
              of reaching each milestone based on how your cohort members progressed. This gives us confidence intervals
              rather than fixed predictions.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Risk Detection
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              We monitor for patterns that historically correlate with setbacks: upcoming significant dates,
              declining mood trends, or reduced engagement. This allows us to proactively offer support.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Continuous Learning
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              As you track outcomes and progress, our predictions become more personalized. We use your actual
              journey to refine estimates and identify what works best for people like you.
            </p>
          </section>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm">
              <strong>Important:</strong> These are statistical predictions, not guarantees. Every healing journey
              is unique. Use these insights as guidance, not gospel. Your actual experience may differ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpgradeModal({ isOpen, onClose, daysUntilUpdate }: { isOpen: boolean; onClose: () => void; daysUntilUpdate: number }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Upgrade to Premium</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">
              Your next free update is in <strong>{daysUntilUpdate} days</strong>.
            </p>
            <p className="text-gray-500 text-sm">
              Premium members get weekly prediction updates for faster, more accurate insights.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-gray-900">Premium Benefits:</h4>
            <ul className="space-y-2">
              {[
                'Weekly prediction updates (vs monthly)',
                'Real-time risk alerts',
                'Detailed cohort comparisons',
                'Export your data & insights',
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <button className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all">
            Upgrade Now
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const { isHydrated, ...subscription } = useUserSubscription();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Set last updated from subscription or current time (only after hydration)
    if (isHydrated) {
      setLastUpdated(subscription.lastPredictionUpdate || new Date());
    }
  }, [isHydrated, subscription.lastPredictionUpdate]);

  const handleRefresh = async () => {
    // Check if user can refresh
    const now = new Date();
    if (!subscription.isPremium && subscription.nextUpdateAvailable && subscription.nextUpdateAvailable > now) {
      setShowUpgrade(true);
      return;
    }

    setIsRefreshing(true);
    // Simulate refresh - in production this would trigger actual prediction recalculation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const daysUntilUpdate = subscription.nextUpdateAvailable
    ? Math.ceil((subscription.nextUpdateAvailable.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      {/* Page Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Healing Forecast</h1>
              <div className="flex items-center gap-3 mt-1">
                {lastUpdated && (
                  <span className="text-sm text-gray-500">
                    Updated {lastUpdated.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                )}
                {!subscription.isPremium && isHydrated && subscription.nextUpdateAvailable && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Next update in {formatTimeUntil(subscription.nextUpdateAvailable)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHowItWorks(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="How predictions work"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  subscription.isPremium
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {isRefreshing ? 'Updating...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Premium Upsell Banner for Free Users */}
        {!subscription.isPremium && (
          <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold">Get Weekly Updates</p>
                  <p className="text-sm text-white/80">Premium members see predictions refresh every week</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpgrade(true)}
                className="px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Healing Forecast Dashboard */}
        <HealingForecast />
      </main>

      {/* Modals */}
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        daysUntilUpdate={daysUntilUpdate}
      />
    </div>
  );
}
