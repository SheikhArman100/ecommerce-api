// Helper function to calculate cart totals
export const calculateCartTotals = (items: any[]) => {
  let totalItems = 0;
  let totalAmount = 0;

  items.forEach(item => {
    totalItems += item.quantity;
    const priceToUse = item.salesPrice ?? item.productFlavorSize?.price ?? 0;
    totalAmount += priceToUse * item.quantity;
  });

  return {
    totalItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};