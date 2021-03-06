'use strict';

const { get } = require('lodash');
const repos = require('../../../lib/connectors/repository');
const newRepos = require('../../../lib/connectors/repos');

const processChargeVersion = require('./process-charge-version');

const { BATCH_STATUS, BATCH_ERROR_CODE } = require('../../../lib/models/batch');
const { FinancialYear } = require('../../../lib/models');
const { isValidForFinancialYear } = require('../lib/charge-version');
const jobService = require('../services/job-service');
const batchJob = require('./lib/batch-job');

/**
 * Create an object ready for saving to the
 * water.billng_batch_charge_version_years table that contains the
 * batch, charge version and financial year values for future processing.
 *
 * @param {Object} billingBatchChargeVersion Object representing the inclusion of a charge version in a batch
 * @param {Number} financialYearEnding The financial year value
 */
const createChargeVersionYear = async (billingBatchChargeVersion, financialYearEnding) => {
  const chargeVersionYear = {
    charge_version_id: billingBatchChargeVersion.chargeVersionId,
    billing_batch_id: billingBatchChargeVersion.billingBatchId,
    financial_year_ending: financialYearEnding,
    status: BATCH_STATUS.processing
  };

  const result = await repos.billingBatchChargeVersionYears.create(chargeVersionYear);
  return get(result, 'rows[0]', null);
};

/**
 * Publishes messages to the queue with the name billing.process-charge-version
 * for each charge version that is valid in any of the financial years.
 *
 * @param {Array} billingBatchChargeVersions The array of billingBatchChargeVersion rows
 * @param {Array} financialYears Array of objects representing financial years
 * @param {Object} messageQueue The PG-Boss message queue
 * @param {String} eventId The event id for use when publishing
 */
const processBillingBatchChargeVersions = async (batch, billingBatchChargeVersions, messageQueue, eventId) => {
  for (const billingBatchChargeVersion of billingBatchChargeVersions) {
    // load the charge version and publish for each year it is valid for
    const chargeVersion = await newRepos.chargeVersions.findOne(billingBatchChargeVersion.chargeVersionId);
    await publishForValidChargeVersion(batch, chargeVersion, billingBatchChargeVersion, messageQueue, eventId);
  }
};

/**
 * For a given charge version, check which financial years it is valid to bill for
 * and publish a billing.process-charge-version message for each occurance.
 *
 * @param {Object} chargeVersion The charge version loaded from the database
 * @param {Array} financialYears Array of objects representing financial years
 * @param {Object} billingBatchChargeVersion An object the maps a charge version to a batch
 * @param {Object} messageQueue The PG-Boss message queue
 * @param {String} eventId The event id used for publishing
 */
const publishForValidChargeVersion = async (batch, chargeVersion, billingBatchChargeVersion, messageQueue, eventId) => {
  const financialYears = FinancialYear.getFinancialYears(batch.startYear.yearEnding, batch.endYear.yearEnding);

  for (const financialYear of financialYears) {
    if (isValidForFinancialYear(chargeVersion, financialYear)) {
      const chargeVersionYear = await createChargeVersionYear(billingBatchChargeVersion, financialYear.endYear);
      const message = processChargeVersion.createMessage(eventId, chargeVersionYear, batch);
      await messageQueue.publish(message);
    }
  }
};

/**
 * Handles the response from populating the billing batch with charge versions and decides
 * whether or not to publish a new job to continue with the batch flow.
 *
 * If batch charge versions were created, then create the batch charge version year
 * entries and publish
 *
 * @param {Object} job PG Boss job (including response from populateBatchChargeVersions handler)
 */
const handlePopulateBatchChargeVersionsComplete = async (job, messageQueue) => {
  batchJob.logOnComplete(job);

  if (batchJob.hasJobFailed(job)) {
    return batchJob.failBatch(job, messageQueue, BATCH_ERROR_CODE.failedToPopulateChargeVersions);
  }

  const { billingBatchChargeVersions, batch } = job.data.response;
  const { eventId } = job.data.request.data;

  if (billingBatchChargeVersions.length === 0) {
    return jobService.setEmptyBatch(eventId, batch.id);
  }

  try {
    await processBillingBatchChargeVersions(batch, billingBatchChargeVersions, messageQueue, eventId);
  } catch (err) {
    batchJob.logOnCompleteError(job, err);
    throw err;
  }
};

module.exports = handlePopulateBatchChargeVersionsComplete;
