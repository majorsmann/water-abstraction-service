const { get } = require('lodash');

const mapConditions = (purposeText, conditions = []) => {
  return conditions.map(condition => {
    return {
      purposeText,
      id: condition.ID,
      code: condition.condition_type.CODE,
      subCode: condition.condition_type.SUBCODE,
      text: condition.TEXT,
      parameter1: condition.PARAM1,
      parameter2: condition.PARAM2
    };
  });
};

/**
 * Extracts all licence conditions across all purposes within a licence.
 */
const extractConditions = (licence = {}) => {
  const purposes = get(licence, 'purposes', []);

  return purposes.reduce((conditions, purpose) => {
    const purposeText = get(purpose, 'purpose[0].purpose_tertiary.DESCR');
    const { licenceConditions } = purpose;
    return [...conditions, ...mapConditions(purposeText, licenceConditions)];
  }, []);
};

module.exports = extractConditions;
