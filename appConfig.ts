/**
 * Application Configuration
 * Used to manage settings for specific website instances sharing the same database.
 */

export const APP_CONFIG = {
  // Specify which suppliers this instance can see/manage (for Inbound/PO)
  ALLOWED_SUPPLIERS: ['Cty FLY MODEM', 'CTY FLY MODEM', 'CTY FLYMODEM'], 
  
  // Specify which brands this instance owns/manages (for Inventory/Products/SO)
  ALLOWED_BRANDS: ['FLY MODEM', 'FLYMODEM', 'Fly Modem'],
  
  // Instance Name
  INSTANCE_NAME: 'Kho Sài Gòn - FLY MODEM',
  
  // Default Warehouse Code if applicable
  DEFAULT_WH_CODE: 'KHO_SG',
};

/**
 * Helper to check if a supplier is allowed
 */
export const isSupplierAllowed = (supplierName: string) => {
  if (!APP_CONFIG.ALLOWED_SUPPLIERS || APP_CONFIG.ALLOWED_SUPPLIERS.length === 0) return true;
  return APP_CONFIG.ALLOWED_SUPPLIERS.some(s => 
    s.toLowerCase() === supplierName.toLowerCase()
  );
};
