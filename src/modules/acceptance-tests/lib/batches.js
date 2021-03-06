'use strict';

const { pool } = require('../../../lib/connectors/db');
const newRepos = require('../../../lib/connectors/repos');

const deleteBatchJobs = batchId => {
  const query = `
    delete from water.job
    where name like '%billing%'
    and data::text like $1;
  `;

  return pool.query(query, [batchId]);
};

const deleteBatch = async batchId => {
  await newRepos.billingBatchChargeVersionYears.deleteByBatchId(batchId);
  await newRepos.billingBatchChargeVersions.deleteByBatchId(batchId);
  await newRepos.billingVolumes.deleteByBatchId(batchId);
  await newRepos.billingTransactions.deleteByBatchId(batchId);
  await newRepos.billingInvoiceLicences.deleteByBatchId(batchId);
  await newRepos.billingInvoices.deleteByBatchId(batchId);
  await newRepos.billingBatches.delete(batchId);
};

const getAcceptanceTestUserBatchIds = async () => {
  const { rows } = await pool.query(`
    select e.metadata->'batch'->>'billing_batch_id' as billing_batch_id
    from water.events e
    where strpos(e.type, 'billing-batch') = 1
    and strpos(e.issuer, 'acceptance-test') = 1;
  `);

  return rows.map(batch => batch.billing_batch_id);
};

const getAnglianAndMidlandsBatchIds = async () => {
  const { rows } = await pool.query(`
    select b.billing_batch_id
    from water.billing_batches b
      join water.regions r on b.region_id = r.region_id
    where r.charge_region_id in ('A', 'B');
  `);

  return rows.map(batch => batch.billing_batch_id);
};

const deleteUniqueBatches = async (batchIds = []) => {
  const toDelete = new Set(batchIds);

  for (const batchId of toDelete) {
    await Promise.all([deleteBatch(batchId), deleteBatchJobs(batchId)]);
  }
};

/**
 * Delete all the batches that the acceptance test user might have created,
 * and delete all the batches for the Anglian and Midlands regions so that future
 * tests can create a batch.
 */
const deleteBatches = async () => {
  const [acceptanceTestBatchIds = [], areaBatchIds = []] = await Promise.all([
    getAcceptanceTestUserBatchIds(),
    getAnglianAndMidlandsBatchIds()
  ]);

  const toDelete = [...acceptanceTestBatchIds, ...areaBatchIds].filter(id => id !== null);

  await deleteUniqueBatches(toDelete);
};

exports.delete = deleteBatches;
