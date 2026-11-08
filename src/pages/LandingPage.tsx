import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { AppShowcase } from '@/components/ui/app-showcase'
import { BentoFeatures } from '@/components/ui/bento-features'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/ui/hero-section'
import { KeyGuide } from '@/components/ui/key-guide'
import { LogoMarquee } from '@/components/ui/logo-marquee'
import { NavBar } from '@/components/ui/nav-bar'
import { PricingPlans } from '@/components/ui/pricing-plans'
import { Reveal } from '@/components/ui/reveal'
import { SiteFooter } from '@/components/ui/site-footer'
import { StoreBadges } from '@/components/ui/store-badges'
import { LANDING_COPY, LANDING_PATH, type Lang } from '@/landing/copy'

const CAR_LOGOS = [
  { name: 'Hyundai', src: '/logos/hyundai.svg', heightClass: 'h-11' },
  { name: 'Kia', src: '/logos/kia.svg', heightClass: 'h-7' },
]

/** 회사 소개 페이지 (/landing 한국어, /landing/en 영어). 로그인 없이 볼 수 있다 */
export function LandingPage({ lang }: { lang: Lang }) {
  const copy = LANDING_COPY[lang]
  const navigate = useNavigate()

  useEffect(() => {
    const previous = { title: document.title, lang: document.documentElement.lang }
    document.title = copy.pageTitle
    document.documentElement.lang = lang
    return () => {
      document.title = previous.title
      document.documentElement.lang = previous.lang
    }
  }, [lang, copy.pageTitle])

  return (
    <div className="min-h-screen bg-background">
      <NavBar
        homeTo={LANDING_PATH[lang]}
        items={copy.nav.items}
        language={copy.nav.language}
        languageTo={LANDING_PATH[copy.nav.switchTo]}
        languageLabel={copy.nav.switchLabel}
        loginLabel={copy.nav.login}
        loginTo="/login"
        downloadLabel={copy.nav.download}
        downloadHref="#download"
      />

      {/* 첫 화면: 소개 글과 버튼, 그 아래 차량 화면. 시동 버튼을 누르면 시작 화면 → 로그인 → 배차 화면을 볼 수 있다 */}
      <section id="features" className="scroll-mt-[72px]">
        <HeroSection
          title={
            <>
              <span className="block">{copy.intro.titleLead}</span>
              <span className="block text-primary/90">{copy.intro.titleAccent}</span>
            </>
          }
          subtitle={copy.intro.subtitle.map((line) => (
            // 넓은 화면에서는 문장마다 한 줄, 좁은 화면에서는 이어서 흐르게 한다
            <span key={line} className="sm:block">{line} </span>
          ))}
          actions={
            <div id="download" className="flex scroll-mt-40 flex-wrap items-center justify-center gap-4">
              <StoreBadges />
              {/* 스토어 배지와 같은 크기로 맞춘 세 번째 버튼 */}
              <Button variant="outline" className="h-[60px] w-[200px] rounded-lg border-border text-base font-semibold" onClick={() => navigate('/login')}>
                {copy.intro.console}
              </Button>
            </div>
          }
          note={copy.intro.note}
          className="min-h-0 md:pb-10"
        />
        <div className="mx-auto max-w-5xl px-4 pb-16 motion-safe:animate-rise sm:pb-24" style={{ animationDelay: '400ms' }}>
          {/* 언어를 바꾸면 꺼진 상태에서 다시 시작한다 */}
          <AppShowcase key={lang} hint={copy.showcase.hint} tagline={copy.showcase.tagline} tabs={copy.showcase.tabs} offLabel={copy.showcase.off} label={copy.showcase.label} />
        </div>
      </section>

      {/* 흐르는 자동차 회사 로고 */}
      <section aria-label={copy.logos.label} className="border-t border-border py-16 text-center [word-break:keep-all] sm:py-20">
        <Reveal>
          <p className="px-4 text-base font-medium text-muted-foreground">{copy.logos.caption}</p>
        </Reveal>
        <Reveal delayMs={80} className="mt-10">
          <LogoMarquee logos={CAR_LOGOS} />
        </Reveal>
      </section>

      {/* 차 안에서 하는 일: Pleos, 차량 신호, 오피넷, 주선사 콘솔 */}
      <section id="brokers" className="scroll-mt-[72px] border-t border-border px-4 py-20 [word-break:keep-all] sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-5xl">{copy.bento.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground [text-wrap:balance]">{copy.bento.subtitle}</p>
          </Reveal>
          <div className="mt-12">
            <BentoFeatures copy={copy.bento} />
          </div>
        </div>
      </section>

      {/* 스마트키로 보는 사용법: 오른쪽 키의 버튼을 누르면 왼쪽에 설명서가 나온다 */}
      <section id="guide" className="scroll-mt-[72px] border-t border-border px-4 py-20 [word-break:keep-all] sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-6xl">
          <KeyGuide key={lang} title={copy.guide.title} subtitle={copy.guide.subtitle} hint={copy.guide.hint} items={copy.guide.items} />
        </Reveal>
      </section>

      {/* 요금제 */}
      <section id="pricing" className="scroll-mt-[72px] border-t border-border bg-muted px-4 py-20 text-center [word-break:keep-all] sm:px-8 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{copy.pricing.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{copy.pricing.subtitle}</p>
          </Reveal>
          <div className="mt-12">
            <PricingPlans plans={copy.pricing.plans} period={copy.pricing.period} recommendedLabel={copy.pricing.recommended} />
          </div>
          <p className="mt-8 text-sm text-muted-foreground">{copy.pricing.note}</p>
        </div>
      </section>

      {/* 맺음: 주황 바탕에 앱 아이콘과 문구 */}
      <section aria-label="ieo." className="bg-orange-500 px-4 py-24 text-center text-white [word-break:keep-all] sm:py-32">
        <Reveal>
          {/* 주황 바탕에는 흰 사각형 + 주황 심볼 아이콘을 쓴다 (브랜드 가이드) */}
          <img src="/ieo_icon_white.svg" alt="ieo." className="mx-auto h-[120px] w-[120px]" />
        </Reveal>
        <Reveal delayMs={150}>
          <p className="mt-7 text-[26px] font-medium tracking-wide text-white/90">{copy.closing.tagline}</p>
        </Reveal>
      </section>

      <SiteFooter description={copy.footer.description} menuLabel={copy.footer.menuLabel} columns={copy.footer.columns} copyright={copy.footer.copyright} />
    </div>
  )
}
