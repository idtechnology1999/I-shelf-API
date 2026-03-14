const axios = require('axios');

// Normalize string for comparison
function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// Calculate similarity between two strings
function calculateSimilarity(str1, str2) {
  const s1 = normalizeTitle(str1);
  const s2 = normalizeTitle(str2);
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.max(0, 100 - (editDistance / longer.length) * 100);
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      matrix[i][j] = str2[i - 1] === str1[j - 1] 
        ? matrix[i - 1][j - 1] 
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[str2.length][str1.length];
}

// Verify ISBN and optionally check title match
async function verifyISBN(isbn, bookTitle = null) {
  if (!isbn) return { verified: false, source: null, titleMatch: false, foundTitle: null, similarity: 0 };

  const cleanISBN = isbn.replace(/[-\s]/g, '');
  let result = { verified: false, source: null, titleMatch: false, foundTitle: null, similarity: 0 };

  // Try Open Library API
  try {
    const response = await axios.get(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`, {
      timeout: 5000
    });
    
    if (response.data && Object.keys(response.data).length > 0) {
      const bookData = response.data[`ISBN:${cleanISBN}`];
      result.verified = true;
      result.source = 'OpenLibrary';
      result.foundTitle = bookData.title || null;
      
      if (bookTitle && result.foundTitle) {
        result.similarity = calculateSimilarity(bookTitle, result.foundTitle);
        result.titleMatch = result.similarity >= 70;
      }
      return result;
    }
  } catch (error) {
    console.log('OpenLibrary check failed:', error.message);
  }

  // Try Google Books API
  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}`, {
      timeout: 5000
    });
    
    if (response.data && response.data.totalItems > 0) {
      const bookData = response.data.items[0].volumeInfo;
      result.verified = true;
      result.source = 'GoogleBooks';
      result.foundTitle = bookData.title || null;
      
      if (bookTitle && result.foundTitle) {
        result.similarity = calculateSimilarity(bookTitle, result.foundTitle);
        result.titleMatch = result.similarity >= 70;
      }
      return result;
    }
  } catch (error) {
    console.log('GoogleBooks check failed:', error.message);
  }

  return result;
}

module.exports = { verifyISBN };
