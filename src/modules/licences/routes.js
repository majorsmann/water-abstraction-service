const Joi = require('joi');
const controller = require('./controller');
const { version } = require('../../../config');

const pathPrefix = `/water/${version}/documents/`;

module.exports = {

  getLicenceByDocumentId: {
    method: 'GET',
    path: `${pathPrefix}{documentId}/licence`,
    handler: controller.getLicenceByDocumentId,
    config: {
      description: 'Returns the current version of the licence for a given document',
      validate: {
        params: {
          documentId: Joi.string().guid().required()
        }
      }
    }
  },

  getLicenceConditionsByDocumentId: {
    method: 'GET',
    path: `${pathPrefix}{documentId}/licence/conditions`,
    handler: controller.getLicenceConditionsByDocumentId,
    config: {
      description: 'Returns the conditions of the current version of the licence for a given document',
      validate: {
        params: {
          documentId: Joi.string().guid().required()
        }
      }
    }
  },

  getLicencePointsByDocumentId: {
    method: 'GET',
    path: `${pathPrefix}{documentId}/licence/points`,
    handler: controller.getLicencePointsByDocumentId,
    config: {
      description: 'Returns the points of the current version of the licence for a given document',
      validate: {
        params: {
          documentId: Joi.string().guid().required()
        }
      }
    }
  }
};