import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Zap } from 'lucide-react';

export interface CTAButton {
  /** The text displayed on the button. */
  label: string;
  /** The action to perform when the button is clicked. */
  onClick: () => void;
  /** Whether the button should be disabled. */
  disabled?: boolean;
}

export interface HeroSectionProps {
  /** 제목 위 작은 배지 문구. 없으면 배지를 그리지 않는다 */
  badge?: string;
  /** 버튼 자리에 넣을 내용 (예: 스토어 배지). 있으면 primaryCta·secondaryCta 대신 그린다 */
  actions?: React.ReactNode;
  /** 버튼 아래 작은 안내 문구 */
  note?: string;
  /** The main, attention-grabbing heading. */
  title: React.ReactNode;
  /** The supporting paragraph explaining the value proposition. */
  subtitle: React.ReactNode;
  /** Configuration for the primary call-to-action button. */
  primaryCta?: CTAButton;
  /** Configuration for the secondary (outline/ghost) call-to-action button. */
  secondaryCta?: CTAButton;
  /** Optional class name for the main container. */
  className?: string;
}

/**
 * 소개 페이지 첫 화면. 가져온 디자인 그대로이고, 색은 index.css의 색 이름으로 브랜드 색에 연결된다.
 * 원본과 다른 점은 테두리에 색을 명시한 것(border-border)과, 열릴 때 요소가 차례로 떠오르는 모션, 배지·안내 문구를 밖에서 받는 것이다
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  badge,
  note,
  actions,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  className,
}) => {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center min-h-[50vh] text-center [word-break:keep-all] p-4 sm:p-8 md:p-16 bg-background text-foreground border-border",
        className
      )}
      role="region"
      aria-label="Product Hero Section"
    >
      <div className="max-w-4xl mx-auto">
        {/* Optional: Simple Feature Highlight Badge */}
        {badge && (
          <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-6 text-muted-foreground bg-muted hover:bg-muted/70 transition-colors duration-150 motion-safe:animate-rise">
            <Zap className="h-3 w-3 mr-1.5 text-primary" aria-hidden="true" />
            {badge}
          </div>
        )}

        {/* Primary Title */}
        <h1 className="motion-safe:animate-rise motion-safe:[animation-delay:80ms] text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.15] tracking-tighter mb-5 text-foreground">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto font-normal [text-wrap:balance] motion-safe:animate-rise motion-safe:[animation-delay:160ms]">
          {subtitle}
        </p>

        {/* CTA Buttons */}
        {actions && <div className="mt-10 motion-safe:animate-rise motion-safe:[animation-delay:240ms]">{actions}</div>}
        {!actions && (primaryCta || secondaryCta) && (
          <div className="mt-10 flex justify-center gap-3 sm:gap-4 flex-wrap motion-safe:animate-rise motion-safe:[animation-delay:240ms]">
            {primaryCta && (
              <Button
                size="lg"
                onClick={primaryCta.onClick}
                disabled={primaryCta.disabled}
                className="text-base font-semibold transition-shadow duration-200 shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {secondaryCta && (
              <Button
                size="lg"
                variant="outline"
                onClick={secondaryCta.onClick}
                disabled={secondaryCta.disabled}
                className="text-base font-semibold transition-colors duration-150 hover:bg-accent hover:text-accent-foreground border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {secondaryCta.label}
              </Button>
            )}
          </div>
        )}

        {note && <p className="mt-8 text-sm text-muted-foreground motion-safe:animate-rise motion-safe:[animation-delay:320ms]">{note}</p>}
      </div>
    </section>
  );
};
