import { api } from './client'

export interface GeocodedAddress {
  address: string
  lat: number
  lng: number
}

export const addressesApi = {
  geocode: (address: string) => api<GeocodedAddress>('/api/brokers/me/addresses/geocode', { query: { address } }),
}