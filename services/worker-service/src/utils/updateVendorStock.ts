import axios from 'axios';

export async function updateVendorStock(vendorName: string, productId: string, quantity: number) {

    console.log("Making stock update api call.")
  const res = await axios.patch(`${process.env.STOCK_SERVICE_URL}/stock/update/${vendorName}`, {
    productId,
    quantity,
  });

  if (!res.data.success) {
    throw new Error(`Vendor rejected: ${res.data.error}`);
  }

  console.log(`Vendor ${vendorName} updated:`, res.data.updatedProduct);
}
