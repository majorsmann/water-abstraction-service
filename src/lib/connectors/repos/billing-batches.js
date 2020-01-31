const { BillingBatch } = require('../bookshelf');
const { paginatedEnvelope } = require('./lib/envelope');

const findOne = async (id) => {
  const model = await BillingBatch
    .forge({ billing_batch_id: id })
    .fetch({
      withRelated: [
        'region'
      ]
    });

  return model.toJSON();
}
;

const findPage = async (page, pageSize) => {
  const result = await BillingBatch
    .forge()
    .orderBy('date_created', 'DESC')
    .fetchPage({
      page,
      pageSize,
      withRelated: [
        'region'
      ]
    });
  return paginatedEnvelope(result);
};

exports.findOne = findOne;
exports.findPage = findPage;