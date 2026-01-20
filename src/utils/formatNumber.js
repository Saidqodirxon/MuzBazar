/**
 * Number formatting utility
 * Formats numbers with spaces for better readability
 * Example: 1000000 -> "1 000 000"
 */

/**
 * Format number with spaces (3 digits groups)
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted number
 */
function formatNumber(amount) {
  const num = Number(amount || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Format currency (with "so'm" suffix)
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted currency
 */
function formatCurrency(amount) {
  return `${formatNumber(amount)} so'm`;
}

module.exports = {
  formatNumber,
  formatCurrency,
};
