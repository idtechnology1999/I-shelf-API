# iShelf Payment Settlement System

## How It Works

### 1. **Reader Purchases Book**
- Reader pays ₦1000 for a book
- Money goes to iShelf platform account
- Transaction is created:
  - Total Amount: ₦1000
  - Author Amount (80%): ₦800
  - Platform Commission (20%): ₦200

### 2. **Automatic Settlement (Production Mode)**
When using Paystack with `settlement_schedule: 'auto'`:
- Paystack automatically transfers author's 80% (₦800) to their bank account within 1-2 business days
- Platform keeps 20% (₦200) commission
- No manual intervention needed

### 3. **Manual Settlement (Test Mode)**
For testing purposes, use the manual settlement endpoint:

```bash
POST /api/authors/settlement/manual-settle
Authorization: Bearer <author_token>
```

This will:
- Calculate all unsettled transactions for the author
- Create a settlement record
- Use Paystack Transfer API to send money to author's bank
- Mark transactions as settled
- Deduct from platform balance

### 4. **Platform Dashboard**
Track your platform earnings:

```bash
GET /api/admin/platform/stats
```

Returns:
- Total Revenue (all book sales)
- Platform Earnings (20% commission)
- Upload Fee Revenue
- Total Paid Out to Authors
- Pending Payouts
- Platform Balance

### 5. **Payment History**
See money in and money out:

```bash
GET /api/admin/platform/payment-history
```

Returns:
- **Money IN**: Book sales commission + Upload fees
- **Money OUT**: Settlements to authors

## Testing the Flow

### Step 1: Reader Buys Book
```bash
# Reader purchases book
POST /api/readers/books/purchase
{
  "bookId": "...",
  "paymentReference": "..."
}
```

### Step 2: Check Platform Balance
```bash
GET /api/admin/platform/stats
```
You'll see:
- Platform Earnings increased by 20%
- Pending Payouts increased by 80%

### Step 3: Trigger Manual Settlement (Test Mode Only)
```bash
POST /api/authors/settlement/manual-settle
Authorization: Bearer <author_token>
```

### Step 4: Check Platform Balance Again
```bash
GET /api/admin/platform/stats
```
You'll see:
- Total Paid Out increased
- Pending Payouts decreased
- Platform Balance remains (your 20% commission)

### Step 5: View Payment History
```bash
GET /api/admin/platform/payment-history
```
You'll see:
- Money IN: Book sale commission (₦200)
- Money OUT: Author settlement (₦800)

## Production vs Test Mode

### Test Mode (Current)
- Uses Paystack test keys
- Manual settlement endpoint for testing
- Simulates real transfers
- No real money moves

### Production Mode
- Uses Paystack live keys (sk_live_...)
- Automatic settlement by Paystack
- Real money transfers
- Authors receive payments automatically within 1-2 business days
- Platform keeps commission automatically

## Important Notes

1. **In Production**: You don't need the manual settlement endpoint. Paystack handles everything automatically.

2. **Platform Commission**: Your 20% is automatically kept in your main Paystack account.

3. **Author Payments**: The 80% goes directly to author's bank account via subaccount settlement.

4. **Upload Fees**: ₦4,800 upload fees go 100% to platform (₦2,000 to referrer if applicable).

## API Endpoints Summary

### Author Endpoints
- `POST /api/authors/settlement/manual-settle` - Trigger manual settlement (test only)
- `GET /api/authors/settlement/pending` - Check pending settlement amount
- `GET /api/authors/settlement/history` - View settlement history

### Platform/Admin Endpoints
- `GET /api/admin/platform/stats` - Platform earnings dashboard
- `GET /api/admin/platform/payment-history` - Money in/out history

## Database Models

### Transaction
- Tracks each book purchase
- Includes `settled` flag
- Records platform commission and author amount

### Settlement
- Groups multiple transactions
- Tracks payout to author
- Stores Paystack transfer details

## Revenue Breakdown

For a ₦1000 book sale:
- **Reader Pays**: ₦1000
- **Author Gets**: ₦800 (80%)
- **Platform Gets**: ₦200 (20%)

For ₦4,800 upload fee:
- **Author Pays**: ₦4,800
- **Referrer Gets**: ₦2,000 (if applicable)
- **Platform Gets**: ₦2,800 or ₦4,800 (if no referrer)
