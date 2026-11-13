import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/ui/reveal'

export interface Plan {
  name: string
  /** 한 줄 설명 */
  tagline: string
  /** 30일 요금 표시 (예: 30,000원). 무료는 "0원" */
  price: string
  /** 이 플랜에서 되는 것. 첫 줄에 "○○의 모든 기능"을 두면 위 플랜과 이어진다 */
  features: string[]
  /** 추천 플랜이면 주황 테두리와 꼬리표가 붙는다 */
  recommended?: boolean
}

/** 요금제 카드 줄. 플랜이 둘 이하면 가운데에 2칸, 더 많으면 넓은 화면 4칸·태블릿 2칸. 폰은 1칸 */
export function PricingPlans({ plans, period, recommendedLabel }: { plans: Plan[]; period: string; recommendedLabel: string }) {
  return (
    <ul className={cn('grid gap-4 text-left sm:grid-cols-2', plans.length > 2 ? 'lg:grid-cols-4' : 'mx-auto max-w-3xl')}>
      {plans.map((plan, i) => (
        <li key={plan.name}>
          <Reveal delayMs={i * 80} className="h-full">
            <div className={cn('flex h-full flex-col rounded-2xl border bg-background p-6', plan.recommended ? 'border-2 border-primary' : 'border-border')}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                {plan.recommended && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{recommendedLabel}</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{period}</span>
              </p>
              <ul className="mt-6 space-y-3 border-t border-border pt-6 text-[15px]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}
