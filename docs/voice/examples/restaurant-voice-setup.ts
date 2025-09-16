/**
 * Example: Setting up restaurant-specific voice configurations
 *
 * This example demonstrates how to configure different voice settings
 * for different types of restaurants using the RestaurantService.
 */

import { RestaurantService } from '../../../server/src/services/restaurant.service';

// Example 1: Fine Dining Restaurant Configuration
async function setupFineDiningVoice(restaurantId: string) {
  await RestaurantService.updateRestaurantSettings(restaurantId, {
    voice: {
      employee: {
        temperature: 0.6,           // Very consistent, professional
        max_response_output_tokens: 25,  // Brief acknowledgments
        presencePenalty: 0.2        // Slightly avoid repetition
      },
      customer: {
        temperature: 0.75,          // Professional but warm
        max_response_output_tokens: 300, // Detailed explanations
        presencePenalty: 0.1        // Minimal repetition avoidance
      }
    }
  });

  console.log('Fine dining voice configuration applied');
}

// Example 2: Fast Casual Restaurant Configuration
async function setupFastCasualVoice(restaurantId: string) {
  await RestaurantService.updateRestaurantSettings(restaurantId, {
    voice: {
      employee: {
        temperature: 0.8,           // More flexible responses
        max_response_output_tokens: 40,  // Quick confirmations
        frequencyPenalty: 0.1       // Avoid repeated phrases
      },
      customer: {
        temperature: 0.9,           // Very conversational
        max_response_output_tokens: 600, // Comprehensive responses
        frequencyPenalty: 0.0       // Natural repetition OK
      }
    }
  });

  console.log('Fast casual voice configuration applied');
}

// Example 3: Coffee Shop Configuration
async function setupCoffeeShopVoice(restaurantId: string) {
  await RestaurantService.updateRestaurantSettings(restaurantId, {
    voice: {
      employee: {
        temperature: 0.85,          // Friendly and casual
        max_response_output_tokens: 35,  // Quick, friendly responses
        topP: 0.9                   // Slightly more focused
      },
      customer: {
        temperature: 0.95,          // Very friendly and casual
        max_response_output_tokens: 450, // Conversational responses
        topP: 1.0                   // Full creativity
      }
    }
  });

  console.log('Coffee shop voice configuration applied');
}

// Example 4: Retrieving and displaying current voice settings
async function displayVoiceSettings(restaurantId: string) {
  console.log(`\n=== Voice Settings for Restaurant ${restaurantId} ===`);

  const employeeSettings = await RestaurantService.getVoiceSettings(restaurantId, 'employee');
  const customerSettings = await RestaurantService.getVoiceSettings(restaurantId, 'customer');

  console.log('\nEmployee Mode Settings:');
  console.log(JSON.stringify(employeeSettings, null, 2));

  console.log('\nCustomer Mode Settings:');
  console.log(JSON.stringify(customerSettings, null, 2));
}

// Example 5: Partial configuration update
async function updateSpecificVoiceSettings(restaurantId: string) {
  // Only update temperature for both modes
  await RestaurantService.updateRestaurantSettings(restaurantId, {
    voice: {
      employee: {
        temperature: 0.65  // Only update temperature
      },
      customer: {
        temperature: 0.88  // Only update temperature
      }
    }
  });

  console.log('Temperature settings updated');
}

// Example usage
async function main() {
  const restaurantId = 'demo-restaurant-123';

  try {
    // Setup initial configuration for a fine dining restaurant
    await setupFineDiningVoice(restaurantId);

    // Display current settings
    await displayVoiceSettings(restaurantId);

    // Update specific settings
    await updateSpecificVoiceSettings(restaurantId);

    // Display updated settings
    await displayVoiceSettings(restaurantId);

  } catch (error) {
    console.error('Error configuring voice settings:', error);
  }
}

// Uncomment to run examples
// main();

export {
  setupFineDiningVoice,
  setupFastCasualVoice,
  setupCoffeeShopVoice,
  displayVoiceSettings,
  updateSpecificVoiceSettings
};