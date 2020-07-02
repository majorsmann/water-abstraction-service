const path = require('path');
const Bull = require('bull');

const logger = require('./lib/logger');
const helpers = require('./lib/helpers');

const { BATCH_ERROR_CODE } = require('../../../lib/models/batch');
const batchService = require('../services/batch-service');
const JOB_NAME = 'billing.populate-batch-charge-versions.*';

const queue = new Bull(JOB_NAME);

const processChargeVersionYearJob = require('./process-charge-version-year');

/**
 * Publishes a new 'populate batch charge versions' job on the queue
 * @param {Object} data
 */
const publish = data => queue.add(data, {
  jobId: helpers.createJobId(JOB_NAME, data.batch)
});

const completedHandler = async (job, result) => {
  logger.logCompleted(job);

  const { batch, chargeVersionYears } = result;

  // Handle empty batch
  if (chargeVersionYears.length === 0) {
    await batchService.setStatusToEmptyWhenNoTransactions(batch);
  } else {
    for (const chargeVersionYear of chargeVersionYears) {
      // Publish new jobs for each charge version year in the batch to process
      await processChargeVersionYearJob.publish({
        ...job.data,
        batch: result.batch,
        chargeVersionYear
      });
    }
  }
};

const failedHandler = helpers.createFailedHandler(BATCH_ERROR_CODE.failedToPopulateChargeVersions, queue, JOB_NAME);

// Set up queue
queue.process(path.join(__dirname, '/processors/populate-batch-charge-versions.js'));
queue.on('completed', completedHandler);
queue.on('failed', failedHandler);

exports.failedHandler = failedHandler;
exports.publish = publish;
exports.JOB_NAME = JOB_NAME;
