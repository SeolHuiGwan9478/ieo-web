import type { KakaoMaps } from './kakaoMaps'

export interface PostcodeResult {
  address: string
  roadAddress: string
  jibunAddress: string
  userSelectedType: 'R' | 'J'
  buildingName: string
}

interface PostcodeConstructor {
  new (options: { oncomplete: (result: PostcodeResult) => void; onresize?: (size: { width: number; height: number }) => void; width: string; height: number | string }): {
    embed: (element: HTMLElement) => void
  }
}

declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeConstructor; maps?: KakaoMaps }
  }
}

let loading: Promise<PostcodeConstructor> | null = null

/** 한 번 로드하고 실패하면 다음 검색에서 다시 시도한다. 팝업 대신 페이지에 삽입한다. */
export function loadPostcode(): Promise<PostcodeConstructor> {
  const existing = window.kakao?.Postcode
  if (existing) return Promise.resolve(existing)
  if (loading) return loading
  loading = new Promise<PostcodeConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = window.setTimeout(fail, 15_000)
    function fail() {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error('주소 검색을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'))
    }
    script.src = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    script.onerror = fail
    script.onload = () => {
      window.clearTimeout(timeout)
      const Postcode = window.kakao?.Postcode
      if (Postcode) resolve(Postcode)
      else fail()
    }
    document.head.append(script)
  }).catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}