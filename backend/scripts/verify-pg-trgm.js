/**
 * PostgreSQL pg_trgm extension verification script
 * 
 * This script checks if the pg_trgm extension is properly installed and working
 * in both your development and test databases.
 */

import { PrismaClient } from '@prisma/client';

// Get connection info from environment or use defaults
const dbUrl = process.env.DATABASE_URL || 'postgresql://jonathanhapp@localhost:5432/concert_poster_marketplace';
const testDbUrl = 'postgresql://jonathanhapp@localhost:5432/concert_poster_marketplace_test';
console.log(`Main database: ${dbUrl}`);
console.log(`Test database: ${testDbUrl}`);

// Create Prisma clients to execute SQL
const mainPrisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

const testPrisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } }
});

/**
 * Verify if pg_trgm extension is properly installed and working
 */
async function verifyPgTrgm(prisma, dbName) {
  console.log(`\n==== ${dbName} ====`);
  
  try {
    // Test 1: Check if pg_trgm extension is installed
    try {
      const extensions = await prisma.$queryRaw`
        SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';
      `;
      
      if (extensions.length > 0) {
        console.log(`✅ pg_trgm extension is installed (version: ${extensions[0].extversion})`);
      } else {
        console.log('❌ pg_trgm extension is NOT installed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking installed extensions:', error.message);
      return false;
    }
    
    // Test 2: Check if similarity function works
    try {
      const simResult = await prisma.$queryRaw`SELECT similarity('test'::text, 'test'::text) as sim;`;
      console.log(`✅ similarity() function works: ${JSON.stringify(simResult)}`);
    } catch (error) {
      console.error('❌ similarity() function failed:', error.message);
      return false;
    }
    
    // Test 3: Check if <-> operator works
    try {
      const distResult = await prisma.$queryRaw`SELECT 'test'::text <-> 'text'::text as dist;`;
      console.log(`✅ <-> operator works: ${JSON.stringify(distResult)}`);
    } catch (error) {
      console.error('❌ <-> operator failed:', error.message);
      return false;
    }
    
    // Test 4: Create a simple test table and verify trigram indexing works
    try {
      // Drop test table if it exists
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS pg_trgm_test;`);
      
      // Create test table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE pg_trgm_test (
          id SERIAL PRIMARY KEY,
          text_col TEXT
        );
      `);
      
      // Insert test data
      await prisma.$executeRawUnsafe(`
        INSERT INTO pg_trgm_test (text_col) VALUES 
        ('apple'), ('banana'), ('cherry'), ('date'), ('elderberry');
      `);
      
      // Create trigram GIN index
      await prisma.$executeRawUnsafe(`
        CREATE INDEX idx_pg_trgm_test_gin ON pg_trgm_test USING gin (text_col gin_trgm_ops);
      `);
      
      // Query using the index
      const indexResult = await prisma.$queryRaw`
        SELECT text_col, similarity(text_col, 'appel') as sim
        FROM pg_trgm_test
        WHERE text_col % 'appel'
        ORDER BY sim DESC;
      `;
      
      console.log(`✅ Trigram indexing works: ${JSON.stringify(indexResult)}`);
      
      // Clean up
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS pg_trgm_test;`);
    } catch (error) {
      console.error('❌ Trigram indexing test failed:', error.message);
      return false;
    }
    
    console.log(`✅ All pg_trgm tests passed for ${dbName}`);
    return true;
  } catch (error) {
    console.error(`❌ Unexpected error during verification: ${error.message}`);
    return false;
  }
}

// Main function to run all verifications
async function run() {
  try {
    // Verify main database
    const mainResult = await verifyPgTrgm(mainPrisma, 'Development Database');
    
    // Verify test database
    const testResult = await verifyPgTrgm(testPrisma, 'Test Database');
    
    // Print summary
    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log(`Development database: ${mainResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test database: ${testResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!mainResult || !testResult) {
      console.log('\n⚠️ pg_trgm extension is not properly installed');
      console.log('Run the installer script: node scripts/install-pg-trgm.js');
    }
    
    process.exit(mainResult && testResult ? 0 : 1);
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  } finally {
    await Promise.all([
      mainPrisma.$disconnect(),
      testPrisma.$disconnect()
    ]);
  }
}

// Execute verification
run();
