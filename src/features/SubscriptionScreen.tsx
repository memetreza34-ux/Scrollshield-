import { Check } from 'lucide-react';
import { Header } from '../components/ui';
import type { SubscriptionPlan } from '../types';

export function SubscriptionScreen({
  plans,
  onBack,
  onSelectPlan,
}: {
  plans: SubscriptionPlan[];
  onBack: () => void;
  onSelectPlan: (planId: SubscriptionPlan['id']) => void;
}) {
  return (
    <div className="p-6 pb-24">
      <Header title="Tarife" onBack={onBack} />
      <div className="space-y-4">
        {plans.map((plan) => (
          <section key={plan.id} aria-labelledby={`plan-${plan.id}`} className="border border-zinc-800 p-5">
            <h2 id={`plan-${plan.id}`} className="text-xl font-bold text-zinc-100">
              {plan.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
            {plan.priceLabel && <p className="mt-3 font-semibold text-zinc-200">{plan.priceLabel}</p>}
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelectPlan(plan.id)}
              className="mt-5 w-full rounded-xl bg-zinc-100 px-4 py-3 font-bold text-zinc-950"
            >
              {plan.actionLabel}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
