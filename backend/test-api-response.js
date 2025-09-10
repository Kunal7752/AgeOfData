// backend/test-api-response.js - Test what your current API returns
const axios = require('axios');

async function testCurrentAPI() {
  try {
    console.log('🔍 Testing current API response...\n');
    
    const response = await axios.get('http://localhost:3000/api/stats/civilizations/romans/complete');
    const data = response.data;
    
    console.log('📊 Current API Response Structure:');
    console.log('==================================');
    console.log('Main keys:', Object.keys(data));
    
    if (data.charts) {
      console.log('\n📈 Charts object keys:', Object.keys(data.charts));
      
      if (data.charts.winRateByPatch) {
        console.log('\n🔴 winRateByPatch sample:', data.charts.winRateByPatch[0]);
        console.log('    - Has playRate?', data.charts.winRateByPatch[0]?.hasOwnProperty('playRate'));
        console.log('    - Has rank?', data.charts.winRateByPatch[0]?.hasOwnProperty('rank'));
      }
      
      if (data.charts.winRateByRating) {
        console.log('\n🟡 winRateByRating sample:', data.charts.winRateByRating[0]);
        console.log('    - Has playRate?', data.charts.winRateByRating[0]?.hasOwnProperty('playRate'));
      }
    }
    
    console.log('\n✅ Test completed');
    console.log('\n📋 DIAGNOSIS:');
    
    if (!data.charts?.winRateByPatch?.[0]?.hasOwnProperty('playRate')) {
      console.log('❌ ISSUE FOUND: Backend NOT returning playRate data');
      console.log('   → Need to apply enhanced backend code');
    } else {
      console.log('✅ Backend IS returning playRate data');
    }
    
    if (!data.charts?.winRateByPatch?.[0]?.hasOwnProperty('rank')) {
      console.log('❌ ISSUE FOUND: Backend NOT returning rank data');  
      console.log('   → Need to apply enhanced backend code');
    } else {
      console.log('✅ Backend IS returning rank data');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n📋 Possible issues:');
    console.log('1. API server not running');
    console.log('2. Wrong endpoint URL'); 
    console.log('3. Romans data not available');
  }
}

testCurrentAPI();