const express = require('express');
const Cart = require('../../models/Cart.model');
const Book = require('../../models/Book.model');
const Transaction = require('../../models/Transaction.model');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

// GET CART ITEMS
router.get('/', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;

    const cartItems = await Cart.find({ readerId })
      .populate({
        path: 'bookId',
        populate: {
          path: 'authorId',
          select: 'displayName fullName'
        }
      })
      .sort({ addedAt: -1 });

    // Filter out items where book or author no longer exists
    const validItems = cartItems.filter(item => item.bookId && item.bookId.authorId);

    res.json({ cartItems: validItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD TO CART
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    const { bookId } = req.body;

    console.log('Add to cart request:', { readerId, bookId });

    if (!bookId) {
      return res.status(400).json({ message: 'Book ID is required' });
    }

    // Check if book exists and is published
    const book = await Book.findById(bookId);
    console.log('Found book:', book ? { id: book._id, title: book.title, status: book.status } : 'Not found');
    
    if (!book || ['draft', 'rejected'].includes(book.status)) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Check if reader already purchased this book
    const existingPurchase = await Transaction.findOne({
      reader: readerId,
      book: bookId,
      status: 'completed'
    });

    if (existingPurchase) {
      return res.status(400).json({ message: 'You have already purchased this book' });
    }

    // Check if already in cart
    const existingCartItem = await Cart.findOne({ readerId, bookId });
    if (existingCartItem) {
      return res.status(400).json({ message: 'Book is already in your cart' });
    }

    // Add to cart
    const cartItem = new Cart({ readerId, bookId });
    await cartItem.save();
    console.log('Cart item created:', cartItem);

    res.json({ 
      success: true, 
      message: 'Book added to cart successfully' 
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// REMOVE FROM CART
router.delete('/remove/:bookId', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    const { bookId } = req.params;

    await Cart.findOneAndDelete({ readerId, bookId });

    res.json({ 
      success: true, 
      message: 'Book removed from cart' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CLEAR CART
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    const readerId = req.user.id;
    await Cart.deleteMany({ readerId });

    res.json({ 
      success: true, 
      message: 'Cart cleared successfully' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;