#!/usr/bin/env node

// Test script for chip_monkey floor plan element

const testChipMonkey = async () => {
  const API_BASE = 'http://localhost:3001/api/v1';
  const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
  
  
  // Test 1: Create a chip_monkey element
  try {
    const response = await fetch(`${API_BASE}/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': RESTAURANT_ID
      },
      body: JSON.stringify({
        label: 'Test Chip Monkey',
        seats: 1,
        x: 300,
        y: 300,
        width: 48,
        height: 48,
        rotation: 0,
        type: 'chip_monkey',
        status: 'available',
        z_index: 1
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create: ${response.status} - ${error}`);
    }
    
    const created = await response.json();
      id: created.id,
      type: created.type,
      label: created.label,
      width: created.width,
      height: created.height
    });
    
    // Test 2: Verify it was saved correctly
    const getResponse = await fetch(`${API_BASE}/tables`, {
      headers: {
        'X-Restaurant-ID': RESTAURANT_ID
      }
    });
    
    const tables = await getResponse.json();
    const chipMonkey = tables.find(t => t.type === 'chip_monkey');
    
    if (chipMonkey) {
        id: chipMonkey.id,
        type: chipMonkey.type,
        label: chipMonkey.label
      });
    } else {
    }
    
    // Test 3: Update the chip_monkey
    if (created.id) {
      const updateResponse = await fetch(`${API_BASE}/tables/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Restaurant-ID': RESTAURANT_ID
        },
        body: JSON.stringify({
          x: 400,
          y: 400
        })
      });
      
      if (updateResponse.ok) {
        const updated = await updateResponse.json();
          x: updated.x,
          y: updated.y
        });
      } else {
      }
      
      // Test 4: Delete the test chip_monkey
      const deleteResponse = await fetch(`${API_BASE}/tables/${created.id}`, {
        method: 'DELETE',
        headers: {
          'X-Restaurant-ID': RESTAURANT_ID
        }
      });
      
      if (deleteResponse.ok) {
      } else {
      }
    }
    
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
testChipMonkey().catch(console.error);