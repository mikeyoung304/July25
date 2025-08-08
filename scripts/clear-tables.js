#!/usr/bin/env node

// Script to clear all existing tables for the default restaurant
const API_BASE_URL = 'http://localhost:3001/api/v1';
const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function clearTables() {
  try {
    // First, get all existing tables
    const response = await fetch(`${API_BASE_URL}/tables`, {
      headers: {
        'x-restaurant-id': RESTAURANT_ID,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tables: ${response.statusText}`);
    }

    const tables = await response.json();
    console.warn(`Found ${tables.length} tables to delete`);

    // Delete each table
    for (const table of tables) {
      console.warn(`Deleting table: ${table.label} (${table.id})`);
      
      const deleteResponse = await fetch(`${API_BASE_URL}/tables/${table.id}`, {
        method: 'DELETE',
        headers: {
          'x-restaurant-id': RESTAURANT_ID,
          'Content-Type': 'application/json'
        }
      });

      if (!deleteResponse.ok) {
        console.error(`Failed to delete table ${table.label}: ${deleteResponse.statusText}`);
      }
    }

    console.warn('All tables have been deleted (soft delete - marked as inactive)');
    console.warn('You can now create your custom floor plan in the Floor Plan editor!');
    
  } catch (error) {
    console.error('Error clearing tables:', error.message);
    console.warn('Make sure the server is running on port 3001');
  }
}

// Run the script
clearTables();