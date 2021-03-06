/**
 * For now this doesn't implement the full model,
 * however following the pattern for batches, the available
 * statuses would be defined here.
 */

/**
 * Statuses that a charge version year (water.billing_batch_charge_version_years) may have. These
 * are here to help enforce that only one batch per region may
 * be run at a time.
 */
const CHARGE_VERSION_YEAR_STATUS = {
  processing: 'processing', // processing trasactions
  ready: 'ready', // processing completed - awaiting approval
  error: 'error'
};

module.exports.CHARGE_VERSION_YEAR_STATUS = CHARGE_VERSION_YEAR_STATUS;
