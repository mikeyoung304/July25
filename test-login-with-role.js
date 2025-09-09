// Test script to verify authentication and role persistence
// Run in browser console after logging in

console.log('=== AUTH DEBUG INFO ===');

// Check localStorage
const authSession = localStorage.getItem('auth_session');
const authUserData = localStorage.getItem('auth_user_data');

if (authSession) {
  console.log('auth_session:', JSON.parse(authSession));
}

if (authUserData) {
  const userData = JSON.parse(authUserData);
  console.log('auth_user_data:', userData);
  console.log('✅ Cached Role:', userData.user?.role);
  console.log('✅ Cached Email:', userData.user?.email);
  console.log('✅ Restaurant ID:', userData.restaurantId);
}

// Check React context (if available)
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('React DevTools detected - check Components tab for AuthContext');
}

// Test /auth/me endpoint directly with restaurant ID
async function testAuthMe() {
  const cachedData = localStorage.getItem('auth_user_data');
  let restaurantId = '11111111-1111-1111-1111-111111111111';
  
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      restaurantId = parsed.restaurantId || restaurantId;
    } catch (e) {}
  }
  
  try {
    const token = await getAuthToken(); // This should be available from auth bridge
    const response = await fetch('http://localhost:3001/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Restaurant-ID': restaurantId
      }
    });
    
    const data = await response.json();
    console.log('✅ /auth/me response:', data);
    console.log('✅ Backend Role:', data.user?.role);
    return data;
  } catch (error) {
    console.error('❌ Failed to call /auth/me:', error);
  }
}

// Run the test
testAuthMe();

console.log('=== END DEBUG INFO ===');