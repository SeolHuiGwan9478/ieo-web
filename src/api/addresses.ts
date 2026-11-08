import { api } from './client'

export interface GeocodedAddress {
  address: string
  lat: number
  lng: number
}

export const addressesApi = {
  geocode: (address: string) => api<GeocodedAddress>('/api/brokers/me/addresses/geocode', { query: { address } }),
}
export interface SavedAddress {
  id: number
  name: string
  address: string
  detailAddress: string
  lat: number
  lng: number
}
export type SaveAddressInput = Omit<SavedAddress, 'id'>

export const savedAddressesApi = {
  list: () => api<SavedAddress[]>('/api/brokers/me/saved-addresses'),
  save: (body: SaveAddressInput) => api<SavedAddress>('/api/brokers/me/saved-addresses', { method: 'POST', body }),
  remove: (id: number) => api<void>(`/api/brokers/me/saved-addresses/${id}`, { method: 'DELETE' }),
}
