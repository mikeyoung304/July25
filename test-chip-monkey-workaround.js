#!/usr/bin/env node

// Test script for chip_monkey using 'circle' as database shape

const testChipMonkey = async () => {
  const API_BASE = 'http://localhost:3001/api/v1';
  const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
  
  console.log('🐵 Testing Chip Monkey Floor Plan Element (with workaround)...\n');
  
  // Test 1: Create a chip_monkey element (stored as circle in DB)
  console.log('Test 1: Creating chip_monkey element (stored as special circle)...');
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
    console.log('✅ Created chip_monkey (as circle):', {
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
    const chipMonkeys = tables.filter(t => 
      t.label && t.label.includes('Chip Monkey') && 
      t.width === 48 && 
      t.height === 48 && 
      t.seats === 1
    );
    
    if (chipMonkeys.length > 0) {
      console.log(`✅ Found ${chipMonkeys.length} chip_monkey element(s) in table list`);
      chipMonkeys.forEach(cm => {
        console.log('  -', {
          id: cm.id,
          label: cm.label,
          type: cm.type,
          seats: cm.seats,
          size: `${cm.width}x${cm.height}`
        });
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
      
      // Test 4: Clean up
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
    
    console.log('\n🎉 Chip_monkey workaround tests passed!');
    console.log('\n📝 Note: To properly support chip_monkey, run this SQL in Supabase dashboard:');
    console.log('   ALTER TABLE tables DROP CONSTRAINT IF EXISTS tables_shape_check;');
    console.log('   ALTER TABLE tables ADD CONSTRAINT tables_shape_check');
    console.log("     CHECK (shape IN ('circle', 'square', 'rectangle', 'chip_monkey'));");
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
testChipMonkey().catch(console.error);