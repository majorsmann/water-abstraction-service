const Joi = require('@hapi/joi');
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
        },
        query: {
          companyId: Joi.string().guid(),
          includeExpired: Joi.boolean().optional().default(false)
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
        },
        query: {
          companyId: Joi.string().guid(),
          includeExpired: Joi.boolean().optional().default(false)
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
        },
        query: {
          companyId: Joi.string().guid(),
          includeExpired: Joi.boolean().optional().default(false)
        }
      }
    }
  },

  getLicenceUsersByDocumentId: {
    method: 'GET',
    path: `${pathPrefix}{documentId}/licence/users`,
    handler: controller.getLicenceUsersByDocumentId,
    config: {
      description: 'Returns the users that are able to access the licence for a given document',
      validate: {
        params: {
          documentId: Joi.string().guid().required()
        },
        query: {
          companyId: Joi.string().guid(),
          includeExpired: Joi.boolean().optional().default(false)
        }
      }
    }
  },

  getLicenceSummaryByDocumentId: {
    method: 'GET',
    path: `${pathPrefix}{documentId}/licence/summary`,
    handler: controller.getLicenceSummaryByDocumentId,
    config: {
      description: 'Returns the licence summary details for a given document',
      validate: {
        params: {
          documentId: Joi.string().guid().required()
        },
        query: {
          companyId: Joi.string().guid(),
          includeExpired: Joi.boolean().optional().default(false)
        }
      }
    }
  },

  getLicenceCommunicationsByDocumentId: {
    method: 'GET',
    path: `${pathPrefix}{documentId}/licence/communications`,
    handler: controller.getLicenceCommunicationsByDocumentId,
    config: {
      description: 'Returns the sent licence notifications for a given document',
      validate: {
        params: {
          documentId: Joi.string().guid().required()
        },
        query: {
          includeExpired: Joi.boolean().optional().default(false),
          companyId: Joi.string().guid()
        }
      }
    }
  }
};
