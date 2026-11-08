export interface MapCoordinate { lat: number; lng: number }
interface LatLng {}
interface MapBounds { extend(point: LatLng): void }
export interface KakaoMap {
  setBounds(bounds: MapBounds, top?: number, right?: number, bottom?: number, left?: number): void
  relayout(): void
}
export interface KakaoMaps {
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => LatLng
  LatLngBounds: new () => MapBounds
  Map: new (element: HTMLElement, options: { center: LatLng; level: number }) => KakaoMap
  CustomOverlay: new (options: { map: KakaoMap; position: LatLng; content: HTMLElement; xAnchor: number; yAnchor: number; zIndex: number }) => { setMap(map: KakaoMap | null): void }
}

let loading: Promise<KakaoMaps> | null = null

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (loading) return loading
  const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim()
  if (!key) return Promise.reject(new Error('지도를 사용하려면 카카오 지도 JavaScript 키를 설정해 주세요.'))
  loading = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = window.setTimeout(fail, 15_000)
    function fail() {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error('지도를 불러오지 못했어요. 연결 상태와 카카오 지도 키의 허용 도메인을 확인해 주세요.'))
    }
    function ready() {
      const maps = window.kakao?.maps
      if (!maps) return fail()
      maps.load(() => {
        window.clearTimeout(timeout)
        resolve(maps)
      })
    }
    if (window.kakao?.maps) ready()
    else {
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`
      script.async = true
      script.onerror = fail
      script.onload = ready
      document.head.append(script)
    }
  }).catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}

export function validCoordinate(point: MapCoordinate | null | undefined): point is MapCoordinate {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
}
