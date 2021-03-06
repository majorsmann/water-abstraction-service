'use strict';

const Joi = require('@hapi/joi');

const { version } = require('../../../../config');

const pathPrefix = `/water/${version}/licences/`;
const controller = require('../controllers/licences');

module.exports = {
  getLicence: {
    method: 'GET',
    path: `${pathPrefix}{licenceId}`,
    handler: controller.getLicence,
    config: {
      description: 'Gets licence by ID',
      validate: {
        params: {
          licenceId: Joi.string().guid().required()
        }
      }
    }
  },

  getLicenceVersions: {
    method: 'GET',
    path: `${pathPrefix}{licenceId}/versions`,
    handler: controller.getLicenceVersions,
    config: {
      description: 'Gets the licence versions by licence ID',
      validate: {
        params: {
          licenceId: Joi.string().uuid().required()
        }
      }
    }
  }
};
