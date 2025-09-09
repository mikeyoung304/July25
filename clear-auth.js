// Quick script to clear auth data from browser
// Run in browser console if needed
localStorage.removeItem('auth_user_data');
localStorage.removeItem('auth_session');
localStorage.removeItem('restaurant-user-role');
console.log('Auth data cleared. Please refresh and log in again.');
