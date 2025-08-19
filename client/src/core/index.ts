// Centralized export to ensure single context instance
export { RestaurantContext, type Restaurant, type RestaurantContextType } from './restaurant-types'
export { RestaurantProvider } from './RestaurantContext'
export { useRestaurant, useRestaurantSettings } from './restaurant-hooks'