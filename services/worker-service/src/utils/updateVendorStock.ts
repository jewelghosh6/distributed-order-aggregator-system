import axios from 'axios';

export async function updateVendorStock(vendorName: string, productId: string, quantity: number) {

    console.log("Making vendor stock update api call.")
    try {
      const res = await axios.patch(`${process.env.STOCK_SERVICE_URL}/stock/update/${vendorName}`, {
        productId,
        quantity,
      });
    
      console.log(`Vendor ${vendorName} updated:`, res.data.updatedProduct);
      if (!res.data.success) {
        throw new Error(`Vendor rejected: ${res.data.error}`);
      }
        
    } catch (error) {
        throw new Error(`ERROR: ${error}`)
    }


}
