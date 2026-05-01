/**
 * Application Configuration
 * Used to manage settings for specific website instances sharing the same database.
 */

export const APP_CONFIG = {
  // Website Identity
  WEBSITE_ID: 9,
  WEBSITE_NAME: 'Kho ESC',

  // Default values to prevent crashes after deleting specific filters
  INSTANCE_NAME: 'Kho ESC - WMS',
  ALLOWED_SUPPLIERS: [],
  ALLOWED_BRANDS: [],
  DEFAULT_WH_CODE: 'KHO_ESC',
};
