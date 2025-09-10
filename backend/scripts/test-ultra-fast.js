// scripts/test-ultra-fast.js
const axios = require('axios');

const quickSpeedTest = async (civ = 'britons') => {
  console.log(`⚡ Quick speed test for ${civ}...\n`);
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `http://localhost:3000/api/stats/civilizations/${civ}/complete`,
      { timeout: 8000 }
    );
    
    const responseTime = Date.now() - startTime;
    const data = response.data;
    const stats = data?.comprehensive?.stats;
    
    console.log(`✅ ${civ}: ${responseTime}ms | ${stats?.totalPicks?.toLocaleString() || 0} games`);
    
    if (responseTime < 2000) {
      console.log('🎉 ULTRA-FAST! Ready for full testing.');
    } else if (responseTime < 4000) {
      console.log('🟡 Decent speed. May need index optimization.');  
    } else {
      console.log('🔴 Still slow. Check database and indexes.');
    }
    
    return responseTime;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ Failed in ${responseTime}ms: ${error.message}`);
    
    if (error.message.includes('timeout')) {
      console.log('💡 Still timing out - need to apply ultra-fast query code');
    }
    
    return null;
  }
};

const testMultipleCivs = async () => {
  console.log('⚡ TESTING MULTIPLE CIVILIZATIONS\n');
  const civs = ['vikings', 'britons', 'byzantines', 'franks'];
  
  for (const civ of civs) {
    await quickSpeedTest(civ);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

const command = process.argv[2];
const civ = process.argv[3];

if (command === 'multi') {
  testMultipleCivs();
} else {
  quickSpeedTest(civ);
}