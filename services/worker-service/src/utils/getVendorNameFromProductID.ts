const vendorMap = {
    p1: 'vendorA',
    p2: 'vendorA',
    p3: 'vendorB',
  };
  
 export const getVendorNameFromProductID =(productId:'p1'|'p2'|'p3')=>  {
    return vendorMap[productId];
}