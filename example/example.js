require('dotenv').config();
const { loginToBullhorn, credentialsFromEnv, tokensFromEnv } = require('bullhorn-auth-client');

async function main() {
  try {
    // Get credentials from environment variables
    const credentials = credentialsFromEnv();
    const tokens = tokensFromEnv();
    
    // Authenticate with Bullhorn
    const auth = await loginToBullhorn({ credentials, tokens });
    
    console.log('✅ Authentication successful!');
    console.log(`   REST URL: ${auth.restUrl}`);
    console.log(`   Method: ${auth.method}`);
    
    // Example API call: fetch candidates
    const fetch = (await import('node-fetch')).default;
    const url = `${auth.restUrl}search/Candidate?query=id:[* TO *]&fields=id,firstName,lastName,email&count=3&BhRestToken=${auth.restToken}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`\n📊 Found ${data.total} candidates, showing first ${data.count}:`);
    data.data.forEach(c => 
      console.log(`   - ${c.firstName} ${c.lastName} (${c.email})`)
    );
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();