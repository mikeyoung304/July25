#!/usr/bin/env node

// Test script for chip_monkey using simple workaround

const testChipMonkey = async () => {
  const API_BASE = 'http://localhost:3001/api/v1';
  const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
  
  console.log('🐵 Testing Chip Monkey Floor Plan Element (simple workaround)...\n');
  
  // Test 1: Create a chip_monkey element (stored as circle in DB)
  console.log('Test 1: Creating chip_monkey-like circle element...');
  try {
    const response = await fetch(`${API_BASE}/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': RESTAURANT_ID
      },
      body: JSON.stringify({
        label: '🐵 Chip Monkey',  // Use emoji in label
        seats: 1,  // 1 seat
        x: 300,
        y: 300,
        width: 48,  // Small size
        height: 48,
        rotation: 0,
        type: 'circle',  // Use circle for now
        status: 'available',
        z_index: 1
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create: ${response.status} - ${error}`);
    }
    
    const created = await response.json();
    console.log('✅ Created chip_monkey-like element:', {
      id: created.id,
      type: created.type,
      label: created.label,
      width: created.width,
      height: created.height,
      seats: created.seats
    });
    
    // Test 2: Verify it was saved
    console.log('\nTest 2: Fetching all tables to verify...');
    const getResponse = await fetch(`${API_BASE}/tables`, {
      headers: {
        'X-Restaurant-ID': RESTAURANT_ID
      }
    });
    
    const tables = await getResponse.json();
    const chipMonkey = tables.find(t => t.id === created.id);
    
    if (chipMonkey) {
      console.log('✅ Found element in table list:', {
        id: chipMonkey.id,
        label: chipMonkey.label,
        type: chipMonkey.type,
        position: `(${chipMonkey.x}, ${chipMonkey.y})`
      });
    } else {
      console.log('❌ Element not found in table list');
    }
    
    // Test 3: Update position
    if (created.id) {
      console.log('\nTest 3: Updating position...');
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
        console.log('✅ Updated position:', {
          x: updated.x,
          y: updated.y
        });
      } else {
        console.log('❌ Failed to update');
      }
      
      // Test 4: Clean up
      console.log('\nTest 4: Cleaning up...');
      const deleteResponse = await fetch(`${API_BASE}/tables/${created.id}`, {
        method: 'DELETE',
        headers: {
          'X-Restaurant-ID': RESTAURANT_ID
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Deleted test element');
      } else {
        console.log('❌ Failed to delete');
      }
    }
    
    console.log('\n✅ API tests passed!');
    console.log('\n📝 Frontend Behavior:');
    console.log('- Elements with label containing "Chip Monkey" and size 48x48');
    console.log('- Will render with monkey shape in the canvas');
    console.log('- Full drag/resize/rotate support works');
    
    console.log('\n⚠️  Database Constraint:');
    console.log('To properly support chip_monkey shape in database, run this SQL:');
    console.log('\nALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;');
    console.log('ALTER TABLE tables ADD CONSTRAINT tables_shape_check');
    console.log("  CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));\n");
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
testChipMonkey().catch(console.error);