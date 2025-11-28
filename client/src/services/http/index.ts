/**
 * HTTP Service exports
 */

export { httpClient, getCurrentRestaurantId, setCurrentRestaurantId, APIError, clearAllCachesForRestaurantSwitch } from './httpClient'
export type { HttpRequestOptions, HttpClient } from './httpClient'
export { RestaurantIdProvider } from './RestaurantIdProvider'
export { useHttpClient } from './hooks'
export type { UseHttpClientReturn } from './hooks'