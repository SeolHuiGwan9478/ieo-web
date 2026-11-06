export interface MarqueeLogo {
  name: string
  src: string
  /** 로고마다 가로세로 비율이 달라 높이를 따로 준다 (예: h-10) */
  heightClass: string
}

/** 로고가 왼쪽으로 끊김 없이 흐르는 줄. 움직임 줄이기를 켠 사람에게는 멈춘 채로 보인다 */
export function LogoMarquee({ logos, repeat = 6 }: { logos: MarqueeLogo[]; repeat?: number }) {
  const oneSet = Array.from({ length: repeat }, () => logos).flat()
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      {/* 같은 묶음을 두 번 놓고 절반만큼 밀면 이음매 없이 돈다 */}
      <ul className="flex w-max items-center motion-safe:animate-marquee">
        {[...oneSet, ...oneSet].map((logo, i) => (
          <li key={i} aria-hidden={i >= logos.length} className="mx-10 shrink-0 sm:mx-14">
            <img src={logo.src} alt={i < logos.length ? logo.name : ''} className={`${logo.heightClass} w-auto`} />
          </li>
        ))}
      </ul>
    </div>
  )
}
