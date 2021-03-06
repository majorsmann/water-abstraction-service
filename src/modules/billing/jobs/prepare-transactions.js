const { logger } = require('../../../logger');
const repos = require('../../../lib/connectors/repository');

const batchService = require('../services/batch-service');
const transactionService = require('../services/transactions-service');
const billingVolumesService = require('../services/billing-volumes-service');
const supplementaryBillingService = require('../services/supplementary-billing-service');
const batchJob = require('./lib/batch-job');

const JOB_NAME = 'billing.prepare-transactions.*';

const createMessage = (eventId, batch) => {
  return batchJob.createMessage(JOB_NAME, batch, { eventId }, {
    singletonKey: batch.id
  });
};

const handlePrepareTransactions = async job => {
  batchJob.logHandling(job);

  try {
    const batch = await batchService.getBatchById(job.data.batch.id);
    const billingVolumesForBatch = await billingVolumesService.getVolumesForBatch(batch);

    if (billingVolumesForBatch.length > 0) {
      await transactionService.updateTransactionVolumes(batch);
    }

    if (batch.isSupplementary()) {
      logger.info(`Processing supplementary transactions ${job.name}`);
      await supplementaryBillingService.processBatch(batch.id);
    }

    // @TODO replace with newRepos.billingBatches.findByBatchId when downstream handlers can cope
    // with camel case
    const transactions = await repos.billingTransactions.getByBatchId(batch.id);

    return {
      batch: job.data.batch,
      transactions
    };
  } catch (err) {
    batchJob.logHandlingError(job, err);
    throw err;
  }
};

exports.jobName = JOB_NAME;
exports.createMessage = createMessage;
exports.handler = handlePrepareTransactions;
