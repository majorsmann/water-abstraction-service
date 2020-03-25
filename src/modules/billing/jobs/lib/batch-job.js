'use strict';

const { get } = require('lodash');

const batchService = require('../../services/batch-service');
const { logger } = require('../../../../logger');

const getRequestName = job => job.data.request.name;

const logHandling = job => {
  logger.info(`Handling: ${job.name}`);
};

const logOnComplete = job => {
  logger.info(`onComplete: ${getRequestName(job)} - ${job.failed ? 'Error' : 'Success'}`);
};

const logOnCompleteError = (job, error) => {
  logger.error(`Error handling onComplete: ${getRequestName(job)}`, error, get(job, 'data.request.data'));
};

const logHandlingError = (job, error) => {
  logger.error(`Error: ${job.name}`, error, job.data);
};

/**
 * In the event that a job fails when processing a batch,
 * this function tidies up so that no further processing
 * happens.
 *
 * The batch record is put in an error state
 * and the queue is deleted to prevent further work.
 *
 * @param {Object<PgBoss.Job>} job The job that has failed
 * @param {Object<PgBoss>} messageQueue The PgBoss message queue
 * @param {number|BATCH_ERROR_CODE} errorCode Why has the batch failed?
 */
const failBatch = (job, messageQueue, errorCode) => {
  const name = getRequestName(job);
  const {
    batch: { billing_batch_id: batchId }
  } = job.data.request.data;

  return Promise.all([
    batchService.setErrorStatus(batchId, errorCode),
    messageQueue.deleteQueue(name)
  ]);
};

/**
 * Creates a message to be added to the PG Boss job queue.
 *
 * @param {String} nameTemplate The queue name including a asterisk that will be replace with the batch id
 * @param {Object<Batch>} batch The batch being processed
 * @param {?Object} data Optional additional data
 * @param {Object?} options Optional options
 */
const createMessage = (nameTemplate, batch, data, options) => {
  return {
    name: nameTemplate.replace('*', batch.billing_batch_id),
    data: {
      batch,
      ...(data && data)
    },
    ...(options && { options })
  };
};

/**
 * Determines if the job has failed
 *
 * @param {Object<PgBoss.Job} job The job passed to the onComplete handler
 */
const hasJobFailed = job => job.data.failed === true;

exports.createMessage = createMessage;
exports.failBatch = failBatch;
exports.hasJobFailed = hasJobFailed;
exports.logHandling = logHandling;
exports.logHandlingError = logHandlingError;
exports.logOnComplete = logOnComplete;
exports.logOnCompleteError = logOnCompleteError;
