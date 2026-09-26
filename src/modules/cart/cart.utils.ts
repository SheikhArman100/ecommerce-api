import { toSolidTaka } from '../../utils';

// Helper function to calculate cart totals
export const calculateCartTotals = (items: any[]) => {
  let totalItems = 0;
  let totalAmount = 0;

  items.forEach(item => {
    totalItems += item.quantity;
    // Prefer the discounted salesPrice (handles 0 correctly), else fall back.
    // Rounded here as a backstop: every unit price is already whole taka, so
    // the subtotal must be too.
    const priceToUse = toSolidTaka(
      item.salesPrice !== undefined ? item.salesPrice : (item.productFlavorSize?.price ?? 0)
    );
    totalAmount += priceToUse * item.quantity;
  });

  return {
    totalItems,
    totalAmount: toSolidTaka(totalAmount),
  };
};