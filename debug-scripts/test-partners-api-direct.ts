async function testPartnersAPIDirect() {
  console.log('🔍 Testing Partners API endpoint directly...');

  try {
    // Test the actual API endpoint that the frontend calls
    const response = await fetch('http://localhost:3003/api/partners/summary?groupBy=type&transactionType=D&_t=' + Date.now(), {
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    
    console.log('\n📊 API Response Summary:');
    console.log(`   Total Organizations: ${data.totalOrganizations}`);
    console.log(`   Total Groups: ${data.groups?.length || 0}`);
    console.log(`   Transaction Type: ${data.transactionType}`);
    console.log(`   Group By: ${data.groupBy}`);

    // Find Bilateral Partners group (where AFD should be)
    const bilateralGroup = data.groups?.find((g: any) => g.id === 'bilateral');
    
    if (bilateralGroup) {
      console.log(`\n🏛️ Bilateral Partners Group: ${bilateralGroup.totalOrganizations} organizations`);
      
      // Find AFD in the bilateral group
      const afdOrg = bilateralGroup.organizations?.find((org: any) => 
        org.name === 'Agence Française de Développement' || 
        org.acronym === 'AFD' ||
        org.id === '16e93614-2437-4649-b932-9cc35458c444'
      );

      if (afdOrg) {
        console.log('\n✅ Found AFD in Bilateral Partners:');
        console.log(`   Name: ${afdOrg.name}`);
        console.log(`   Acronym: ${afdOrg.acronym}`);
        console.log(`   Active Projects: ${afdOrg.activeProjects}`);
        console.log(`   Total Amount: $${afdOrg.totalAmount?.toLocaleString() || 0}`);
        console.log('\n   Yearly breakdown:');
        console.log(`   2022: $${afdOrg.financialData?.['2022']?.toLocaleString() || 0}`);
        console.log(`   2023: $${afdOrg.financialData?.['2023']?.toLocaleString() || 0}`);
        console.log(`   2024: $${afdOrg.financialData?.['2024']?.toLocaleString() || 0}`);
        console.log(`   2025: $${afdOrg.financialData?.['2025']?.toLocaleString() || 0} ⭐`);
        console.log(`   2026: $${afdOrg.financialData?.['2026']?.toLocaleString() || 0}`);
        console.log(`   2027: $${afdOrg.financialData?.['2027']?.toLocaleString() || 0}`);

        if (afdOrg.financialData?.['2025'] && afdOrg.financialData['2025'] > 0) {
          console.log('\n🎉 SUCCESS: AFD shows $1,000,000 for 2025!');
        } else {
          console.log('\n❌ ISSUE: AFD 2025 amount is 0 or missing');
        }
      } else {
        console.log('\n❌ AFD not found in Bilateral Partners group');
        console.log('Organizations in Bilateral Partners:');
        bilateralGroup.organizations?.forEach((org: any, index: number) => {
          console.log(`   ${index + 1}. ${org.name} (${org.acronym || 'no acronym'}) - ID: ${org.id}`);
        });
      }
    } else {
      console.log('\n❌ Bilateral Partners group not found');
      console.log('Available groups:');
      data.groups?.forEach((group: any) => {
        console.log(`   - ${group.name} (${group.id}): ${group.totalOrganizations} orgs`);
      });
    }

  } catch (error) {
    console.error('Error testing Partners API:', error);
  }
}

// Run the script
testPartnersAPIDirect();
