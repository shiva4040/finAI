/**
 * Financial formatting utilities
 */

export const formatCurrency = (amount, currency = 'INR') => {
  const numericAmount = Number(amount) || 0;
  const isNegative = numericAmount < 0;
  const absAmount = Math.abs(numericAmount);

  // Format with Indian Rupee symbol or specified currency
  const symbol = currency === 'INR' ? '₹' : '$';
  
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `−${symbol}${formattedNumber}` : `${symbol}${formattedNumber}`;
};

export const formatCompactNumber = (number) => {
  const num = Number(number) || 0;
  if (Math.abs(num) >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (Math.abs(num) >= 1000) {
    return `₹${(num / 1000).toFixed(1)}k`;
  }
  return `₹${num.toFixed(0)}`;
};

export const formatPercentage = (percent) => {
  const num = Number(percent) || 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

export const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const past = new Date(timestamp);
  const diffInMinutes = Math.floor((now - past) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(timestamp);
};

export const generateUniqueId = (prefix = 'ID') => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
};
