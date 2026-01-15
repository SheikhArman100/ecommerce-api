// Helper function to calculate cart totals
export const calculateCartTotals = (items: any[]) => {
  let totalItems = 0;
  let totalAmount = 0;

  items.forEach(item => {
    totalItems += item.quantity;
    totalAmount += (item.productFlavorSize?.price || 0) * item.quantity;
  });

  return {
    totalItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};