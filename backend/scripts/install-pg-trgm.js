/**
 * PostgreSQL pg_trgm extension installer script
 * 
 * This script attempts to install the pg_trgm extension in your PostgreSQL database
 * which is required for fuzzy search functionality in the application.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

// Get connection info from environment or use defaults
const dbUrl = process.env.DATABASE_URL || 'postgresql://jonathanhapp@localhost:5432/concert_poster_marketplace';
const testDbUrl = 'postgresql://jonathanhapp@localhost:5432/concert_poster_marketplace_test';
console.log(`Using main database: ${dbUrl}`);
console.log(`Using test database: ${testDbUrl}`);

// Create Prisma clients to execute SQL
const mainPrisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

const testPrisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } }
});

/**
 * Attempts to install pg_trgm extension in a specific database
 */
async function installPgTrgm(prismaClient, dbUrl, dbName) {
  console.log(`\nAttempting to install pg_trgm extension for ${dbName}...`);

  // Method 1: Try using Prisma client directly
  try {
    console.log('Method 1: Creating extension via Prisma client...');
    await prismaClient.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log(`✅ Successfully created pg_trgm extension via Prisma in ${dbName}!`);
    return true;
  } catch (error) {
    console.error('Error creating extension via Prisma:', error.message);
  }

  // Method 2: Try using psql command directly
  try {
    console.log('Method 2: Creating extension via psql command...');
    
    const { stdout, stderr } = await execAsync(
      `psql ${dbUrl} -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"`
    );
    
    if (stderr && !stderr.includes('already exists')) {
      console.error('psql error:', stderr);
    } else {
      console.log('psql output:', stdout || 'No output (success)');
      console.log(`✅ Successfully created pg_trgm extension via psql command in ${dbName}!`);
      return true;
    }
  } catch (error) {
    console.error('Error running psql command:', error.message);
  }
  
  // Method 3: Check if extension already exists and is available
  try {
    console.log('Method 3: Checking if extension is already available...');
    const result = await prismaClient.$queryRaw`SELECT 'a'::text <-> 'b'::text AS dist;`;
    console.log('Extension test result:', result);
    console.log(`✅ pg_trgm extension is already installed and working in ${dbName}!`);
    return true;
  } catch (error) {
    console.error('Extension is not available:', error.message);
  }
  
  // If we get here, all methods failed
  console.error(`❌ Failed to install pg_trgm extension for ${dbName}.`);
  return false;
}

// Create the test database if it doesn't exist
async function ensureTestDatabaseExists() {
  try {
    console.log(`\nEnsuring test database exists...`);
    
    // Extract database name from URL
    const dbNameMatch = testDbUrl.match(/\/([^/?]+)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'concert_poster_marketplace_test';
    
    const { stdout, stderr } = await execAsync(
      `psql -d postgres -c "SELECT 1 FROM pg_database WHERE datname='${dbName}'" | grep -q 1 || psql -d postgres -c "CREATE DATABASE ${dbName}"`
    );
    
    if (stderr && !stderr.includes('already exists')) {
      console.error('Error creating test database:', stderr);
      return false;
    }
    
    console.log(`✅ Test database '${dbName}' is ready`);
    return true;
  } catch (error) {
    console.error('Error ensuring test database exists:', error);
    return false;
  }
}

// Main function to install pg_trgm in both development and test databases
async function run() {
  try {
    // First ensure the test database exists
    await ensureTestDatabaseExists();
    
    // Install pg_trgm in main database
    const mainResult = await installPgTrgm(mainPrisma, dbUrl, 'development database');
    
    // Install pg_trgm in test database
    const testResult = await installPgTrgm(testPrisma, testDbUrl, 'test database');
    
    // Verify installation in main database
    if (mainResult) {
      try {
        const mainVerifyResult = await mainPrisma.$queryRaw`SELECT similarity('test'::text, 'test'::text) as sim;`;
        console.log('\n✅ Main database similarity test result:', mainVerifyResult);
      } catch (error) {
        console.error('\n❌ Main database similarity test failed:', error.message);
      }
    }
    
    // Verify installation in test database
    if (testResult) {
      try {
        const testVerifyResult = await testPrisma.$queryRaw`SELECT similarity('test'::text, 'test'::text) as sim;`;
        console.log('✅ Test database similarity test result:', testVerifyResult);
      } catch (error) {
        console.error('❌ Test database similarity test failed:', error.message);
      }
    }
    
    // Final status report
    console.log('\n=== INSTALLATION SUMMARY ===');
    console.log(`Development database: ${mainResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Test database: ${testResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (!mainResult || !testResult) {
      console.log('\n⚠️ Manual installation may be required:');
      console.log('1. Connect to PostgreSQL: psql <database_name>');
      console.log('2. Run the SQL command: CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      console.log('3. Verify with: SELECT similarity(\'test\'::text, \'test\'::text);');
    }
    
    process.exit(mainResult && testResult ? 0 : 1);
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  } finally {
    // Disconnect Prisma clients
    await Promise.all([
      mainPrisma.$disconnect(),
      testPrisma.$disconnect()
    ]);
  }
}

// Execute the installation process
run();