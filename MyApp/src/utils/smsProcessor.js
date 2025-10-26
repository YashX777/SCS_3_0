/**
 * Processes a list of raw SMS messages fetched from the device.
 * Filters for transactions, parses details, and categorizes them.
 *
 * @param {Array<Object>} rawSmsList - Array of SMS objects from react-native-get-sms-android.
 * Each object should have keys like _id, address, date (timestamp), body, type.
 * @returns {Array<Object>} - Array of structured transaction objects.
 */
export function processSmsList(rawSmsList) {
  if (!Array.isArray(rawSmsList)) {
    console.error("Invalid input: rawSmsList must be an array.");
    return [];
  }

  // 1. Filter for transaction messages (like Filter_Transactions.py)
  const transactionSms = rawSmsList.filter(sms => {
    const bodyLower = sms.body?.toLowerCase() || '';
    // Use regex to check for debited/credited/sent (case-insensitive)
    return /\b(debited|credited|sent|paid)\b/i.test(bodyLower);
  });

  // 2. Parse and categorize each transaction (like FinalForm.py)
  const structuredTransactions = transactionSms.map(sms => {
    const body = sms.body || ''; // Ensure body is a string

    const date = parseDate(sms.date); // Convert timestamp to YYYY-MM-DD
    const amount = extractAmount(body);
    const type = extractType(body);
    const description = extractDescription(body);
    const category = categorize(body, description);

    return {
      id: sms._id, // Keep the original SMS ID for reference
      date: date,
      description: description || sms.address || 'Unknown', // Use sender if description fails
      amount: amount,
      type: type,
      category: category,
      originalBody: body, // Keep original body for debugging or detail view
    };
  }).filter(tx => tx.amount !== null && tx.type !== 'unknown'); // Only keep valid transactions

  // Sort by date descending (newest first)
  structuredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));


  return structuredTransactions;
}

// --- Helper Functions (Translated from FinalForm.py) ---

function parseDate(timestamp) {
  try {
    if (!timestamp) return 'Invalid Date';
    // Assuming timestamp is in milliseconds
    const date = new Date(parseInt(timestamp, 10));
    if (isNaN(date.getTime())) return 'Invalid Date';

    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return 'Invalid Date';
  }
}


function extractAmount(text) {
  if (!text) return null;
  // Regex to find Rs. or Rs followed by optional space and digits/commas/decimal
  const match = text.match(/Rs\.?\s?([\d,]+\.?\d*)/i);
  if (match && match[1]) {
    try {
      // Remove commas before converting to float
      return parseFloat(match[1].replace(/,/g, ''));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function extractType(text) {
  if (!text) return 'unknown';
  const textLower = text.toLowerCase();
  if (textLower.includes('credited')) {
    return 'credit';
  } else if (textLower.includes('debited') || textLower.includes('sent') || textLower.includes('paid')) {
    return 'debit';
  } else {
    return 'unknown';
  }
}

function extractDescription(text) {
  if (!text) return null;
  // Try finding 'to [Payee Name]' (assuming payee name might be multiple words, often uppercase initially)
  let match = text.match(/\bto\s+([A-Z][A-Za-z\s.,'-]+)/i);
  if (match && match[1]) {
    // Basic cleanup: Title case and remove trailing junk like periods or spaces
    return match[1].trim().replace(/\.$/, '').trim()
            // Simple title casing
           .toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }
  // Try finding 'from [Sender Name]'
  match = text.match(/\bfrom\s+([A-Z][A-Za-z\s.,'-]+)/i);
   if (match && match[1]) {
     return match[1].trim().replace(/\.$/, '').trim()
            .toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
  }
  // Add more specific patterns if needed (e.g., VPA@, UPI Ref)
  match = text.match(/VPA\s+([\w.-]+@[\w.-]+)/i);
  if (match && match[1]) return match[1];

  match = text.match(/UPI Ref No[:\s]+(\d+)/i);
   if(match && match[1]) return `UPI Ref ${match[1]}`; // Return a generic description

  return null; // Return null if no specific description found
}


// --- Categorization Logic ---

const CATEGORY_KEYWORDS = {
  // Order matters: more specific keywords first might be better
  'atm': 'Cash Withdrawal',
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'zomato': 'Food',
  'swiggy': 'Food',
  'restaurant': 'Food',
  'netflix': 'Entertainment',
  'spotify': 'Entertainment', // Added
  'movie': 'Entertainment',
  'inox': 'Entertainment',
  'irctc': 'Travel',
  'ola': 'Travel',
  'uber': 'Travel',
  'vijayanand': 'Travel', // Assuming travel company
  'fuel': 'Fuel',
  'petrol': 'Fuel',
  'electricity': 'Bills',
  'water bill': 'Bills', // Made slightly more specific
  'recharge': 'Bills',
  'bill': 'Bills', // General bill last
  'upi': 'Transfer',
  'pay': 'Payment', // General payment last before default
};

const PAYEE_CATEGORY_OVERRIDE = {
  // Use lowercase keys for easier matching
  'kamdhenu milk distributor': 'Groceries', // Changed from Food
  'spotify': 'Subscription', // Different from keyword category
  'zomato': 'Food',
  'swiggy': 'Food',
  'amazon': 'Shopping',
  'flipkart': 'Shopping',
  'netflix': 'Subscription', // Changed from Entertainment
  'irctc': 'Travel',
  'ola': 'Travel',
  'uber': 'Travel',
  'vijayanand': 'Travel',
  'recharge': 'Bills',
  'inox': 'Entertainment',
  'bescom': 'Bills', // Example: Added specific biller
  'bwssb': 'Bills',  // Example: Added specific biller
};

function categorize(text, description) {
  const descLower = (description || '').toLowerCase();
  const textLower = (text || '').toLowerCase();

  // 1. Check Payee Overrides first
  for (const payee in PAYEE_CATEGORY_OVERRIDE) {
    if (descLower.includes(payee)) {
      return PAYEE_CATEGORY_OVERRIDE[payee];
    }
  }

  // 2. Check Keywords in the body text
  for (const keyword in CATEGORY_KEYWORDS) {
    if (textLower.includes(keyword)) {
      return CATEGORY_KEYWORDS[keyword];
    }
  }

  // 3. Default Category
  return 'Other';
}