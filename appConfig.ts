/**
 * Application Configuration
 * Used to manage settings for specific website instances sharing the same database.
 */

export const APP_CONFIG = {
  // Website Identity
  WEBSITE_ID: 3,
  WEBSITE_NAME: 'Kho hàng SG',

  // Default values to prevent crashes after deleting specific filters
  INSTANCE_NAME: 'Kho hàng SG - WMS',
  ALLOWED_SUPPLIERS: [], 
  ALLOWED_BRANDS: [],
  DEFAULT_WH_CODE: 'KHO_SG',
};
