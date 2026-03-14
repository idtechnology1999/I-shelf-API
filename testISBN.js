// Test ISBN Verification System
// Run this in your backend: node testISBN.js

const { verifyISBN } = require('./services/isbn.service');

async function testISBNVerification() {
  console.log('=== ISBN Verification System Test ===\n');

  // Test cases
  const testCases = [
    {
      isbn: '978-0-13-110362-7',
      title: 'The C Programming Language',
      description: 'Valid ISBN with exact title match'
    },
    {
      isbn: '978-0-596-52068-7',
      title: 'JavaScript: The Good Parts',
      description: 'Valid ISBN with exact title match'
    },
    {
      isbn: '978-0-134-68599-1',
      title: 'Clean Code',
      description: 'Valid ISBN with partial title match'
    },
    {
      isbn: '978-0-13-110362-7',
      title: 'Wrong Book Title',
      description: 'Valid ISBN but wrong title'
    },
    {
      isbn: '123-4-56-789012-3',
      title: 'Fake Book',
      description: 'Invalid ISBN'
    },
    {
      isbn: '',
      title: 'No ISBN Book',
      description: 'Empty ISBN'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📚 Test: ${testCase.description}`);
    console.log(`   ISBN: ${testCase.isbn || 'N/A'}`);
    console.log(`   Title: ${testCase.title}`);
    
    try {
      const result = await verifyISBN(testCase.isbn, testCase.title);
      
      console.log(`   ✓ Verified: ${result.verified}`);
      console.log(`   ✓ Source: ${result.source || 'N/A'}`);
      console.log(`   ✓ Found Title: ${result.foundTitle || 'N/A'}`);
      console.log(`   ✓ Title Match: ${result.titleMatch}`);
      console.log(`   ✓ Similarity: ${result.similarity}%`);
      
      if (result.verified && result.titleMatch) {
        console.log('   ✅ WOULD AUTO-APPROVE');
      } else if (result.verified && !result.titleMatch) {
        console.log('   ⚠️  NEEDS MANUAL REVIEW (Title mismatch)');
      } else {
        console.log('   ❌ NEEDS MANUAL REVIEW (ISBN not verified)');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Test Complete ===\n');
}

// Run tests
testISBNVerification().catch(console.error);
