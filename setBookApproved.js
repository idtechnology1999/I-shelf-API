// Script to manually set books to approved status for testing
// Run: node ishelf_server/setBookApproved.js

require('dotenv').config({ path: './config/.env.development.local' });
const mongoose = require('mongoose');
const Book = require('./models/Book.model');
const { verifyISBN } = require('./services/isbn.service');

// Connect to database
const dbConfig = require('./config/db');

async function setBookToApproved() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ishelf');
    console.log('✓ Connected to database\n');

    // Find all pending books
    const pendingBooks = await Book.find({ status: 'pending' })
      .populate('authorId', 'fullName displayName');

    if (pendingBooks.length === 0) {
      console.log('No pending books found.');
      console.log('\nLet\'s check all books:');
      
      const allBooks = await Book.find().populate('authorId', 'fullName displayName');
      console.log(`\nTotal books in database: ${allBooks.length}`);
      
      allBooks.forEach((book, index) => {
        console.log(`\n${index + 1}. ${book.title}`);
        console.log(`   Status: ${book.status}`);
        console.log(`   ISBN: ${book.isbn || 'N/A'}`);
        console.log(`   ID: ${book._id}`);
      });
      
      process.exit(0);
    }

    console.log(`Found ${pendingBooks.length} pending book(s):\n`);

    for (let i = 0; i < pendingBooks.length; i++) {
      const book = pendingBooks[i];
      console.log(`${i + 1}. ${book.title}`);
      console.log(`   Author: ${book.authorId?.displayName || book.authorId?.fullName || 'Unknown'}`);
      console.log(`   ISBN: ${book.isbn || 'N/A'}`);
      console.log(`   Status: ${book.status}`);
      console.log(`   ID: ${book._id}`);
      
      // If book has ISBN, verify it
      if (book.isbn) {
        console.log(`   Verifying ISBN...`);
        try {
          const result = await verifyISBN(book.isbn, book.title);
          console.log(`   ✓ ISBN Verified: ${result.verified}`);
          console.log(`   ✓ Title Match: ${result.titleMatch}`);
          console.log(`   ✓ Similarity: ${result.similarity}%`);
          
          // Update book with verification results
          book.isbnVerified = result.verified;
          book.isbnVerificationAttempted = true;
          book.titleMatch = result.titleMatch;
          book.foundTitle = result.foundTitle;
          book.titleSimilarity = result.similarity;
          book.verificationSource = result.source;
          
          // Set to approved
          book.status = 'approved';
          await book.save();
          
          console.log(`   ✅ Book moved to APPROVED status\n`);
        } catch (error) {
          console.log(`   ❌ Verification failed: ${error.message}`);
          
          // Still move to approved for testing
          book.status = 'approved';
          await book.save();
          console.log(`   ✅ Book moved to APPROVED status (without verification)\n`);
        }
      } else {
        // No ISBN, just approve it
        book.status = 'approved';
        await book.save();
        console.log(`   ✅ Book moved to APPROVED status (no ISBN)\n`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ All pending books have been moved to approved status!');
    console.log('\nYou can now fetch approved books using:');
    console.log('GET /api/admin/books?status=approved');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

// Run the script
setBookToApproved();
