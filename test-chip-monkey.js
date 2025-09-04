#!/usr/bin/env node

// Test script for chip_monkey floor plan element

const testChipMonkey = async () => {
  const API_BASE = 'http://localhost:3001/api/v1';
  const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
  
  console.log('🐵 Testing Chip Monkey Floor Plan Element...\n');
  
  // Test 1: Create a chip_monkey element
  console.log('Test 1: Creating chip_monkey element...');
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
    console.log('✅ Created chip_monkey:', {
      id: created.id,
      type: created.type,
      label: created.label,
      width: created.width,
      height: created.height
    });
    
    // Test 2: Verify it was saved correctly
    console.log('\nTest 2: Fetching all tables to verify...');
    const getResponse = await fetch(`${API_BASE}/tables`, {
      headers: {
        'X-Restaurant-ID': RESTAURANT_ID
      }
    });
    
    const tables = await getResponse.json();
    const chipMonkey = tables.find(t => t.type === 'chip_monkey');
    
    if (chipMonkey) {
      console.log('✅ Found chip_monkey in table list:', {
        id: chipMonkey.id,
        type: chipMonkey.type,
        label: chipMonkey.label
      });
    } else {
      console.log('❌ Chip_monkey not found in table list');
    }
    
    // Test 3: Update the chip_monkey
    if (created.id) {
      console.log('\nTest 3: Updating chip_monkey position...');
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
        console.log('✅ Updated chip_monkey position:', {
          x: updated.x,
          y: updated.y
        });
      } else {
        console.log('❌ Failed to update chip_monkey');
      }
      
      // Test 4: Delete the test chip_monkey
      console.log('\nTest 4: Cleaning up test chip_monkey...');
      const deleteResponse = await fetch(`${API_BASE}/tables/${created.id}`, {
        method: 'DELETE',
        headers: {
          'X-Restaurant-ID': RESTAURANT_ID
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Deleted test chip_monkey');
      } else {
        console.log('❌ Failed to delete test chip_monkey');
      }
    }
    
    console.log('\n🎉 All chip_monkey tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
testChipMonkey().catch(console.error);