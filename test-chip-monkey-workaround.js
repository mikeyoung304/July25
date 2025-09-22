#!/usr/bin/env node

// Test script for chip_monkey using 'circle' as database shape

const testChipMonkey = async () => {
  const API_BASE = 'http://localhost:3001/api/v1';
  const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
  
  
  // Test 1: Create a chip_monkey element (stored as circle in DB)
  try {
    const response = await fetch(`${API_BASE}/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': RESTAURANT_ID
      },
      body: JSON.stringify({
        label: 'Chip Monkey 1',  // Special naming convention
        seats: 1,  // 1 seat indicates chip_monkey
        x: 300,
        y: 300,
        width: 48,  // 48x48 indicates chip_monkey
        height: 48,
        rotation: 0,
        type: 'circle',  // Use circle as workaround
        status: 'available',
        z_index: 1,
        metadata: { actualType: 'chip_monkey' }  // Store real type in metadata
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
      height: created.height,
      seats: created.seats
    });
    
    // Test 2: Verify it was saved
    const getResponse = await fetch(`${API_BASE}/tables`, {
      headers: {
        'X-Restaurant-ID': RESTAURANT_ID
      }
    });
    
    const tables = await getResponse.json();
    const chipMonkeys = tables.filter(t => 
      t.label && t.label.includes('Chip Monkey') && 
      t.width === 48 && 
      t.height === 48 && 
      t.seats === 1
    );
    
    if (chipMonkeys.length > 0) {
      chipMonkeys.forEach(cm => {
          id: cm.id,
          label: cm.label,
          type: cm.type,
          seats: cm.seats,
          size: `${cm.width}x${cm.height}`
        });
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
      
      // Test 4: Clean up
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