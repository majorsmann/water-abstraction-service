const { ChargeVersion } = require('../bookshelf');

const findOne = async (id) => {
  const model = await ChargeVersion
    .forge({ chargeVersionId: id })
    .fetch({
      withRelated: [
        'chargeElements'
      ]
    });

  return model.toJSON();
};

exports.findOne = findOne;