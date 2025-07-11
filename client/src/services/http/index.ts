/**
 * HTTP Service exports
 */

export { httpClient, getCurrentRestaurantId, setCurrentRestaurantId, APIError } from './httpClient'
export type { HttpRequestOptions, HttpClient } from './httpClient'
export { RestaurantIdProvider } from './RestaurantIdProvider'