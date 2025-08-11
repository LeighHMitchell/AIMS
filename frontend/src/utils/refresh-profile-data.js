// Temporary fix to refresh profile data
// You can paste this in the console to reload fresh data

async function refreshProfileData() {
  console.log('🔄 Refreshing profile data from database...');
  
  try {
    // Get current user email
    const localUser = JSON.parse(localStorage.getItem('aims_user') || '{}');
    if (!localUser.email) {
      console.error('❌ No user email found');
      return;
    }
    
    console.log('📧 User email:', localUser.email);
    
    // Fetch fresh data from API
    const response = await fetch(`/api/users?email=${encodeURIComponent(localUser.email)}`);
    
    if (!response.ok) {
      console.error('❌ Failed to fetch user data:', response.status);
      return;
    }
    
    const freshUserData = await response.json();
    console.log('📦 Fresh user data from database:', freshUserData);
    
    // Update localStorage with fresh data
    const updatedUser = {
      ...localUser,
      firstName: freshUserData.first_name,
      lastName: freshUserData.last_name,
      jobTitle: freshUserData.job_title,
      department: freshUserData.department,
      telephone: freshUserData.telephone,
      website: freshUserData.website,
      mailingAddress: freshUserData.mailing_address,
      organisation: freshUserData.organisation,
      bio: freshUserData.bio,
      timezone: freshUserData.timezone,
      preferredLanguage: freshUserData.preferred_language
    };
    
    localStorage.setItem('aims_user', JSON.stringify(updatedUser));
    console.log('✅ Updated localStorage with fresh data');
    
    // Force page refresh to pick up new data
    console.log('🔄 Refreshing page to show updated data...');
    window.location.reload();
    
  } catch (error) {
    console.error('💥 Error refreshing profile data:', error);
  }
}

// Run the refresh
refreshProfileData();

console.log('💡 After the page reloads, try clicking Edit again - the fields should now be populated!');
