const moment = require('moment');
const { dbQuery } = require('./db');

/**
 * Gets form logs for specified licence number
 * @param {String} licenceNumber
 * @return {Promise} resolves with array of DB records
 */
const getFormats = (licenceNumber) => {
  const query = `
  SELECT f.* FROM "import"."NALD_ABS_LICENCES" l
  LEFT JOIN "import"."NALD_RET_FORMATS" f ON l."ID"=f."ARVN_AABL_ID" AND l."FGAC_REGION_CODE"=f."FGAC_REGION_CODE"
  WHERE l."LIC_NO"=$1`;
  const params = [licenceNumber];
  return dbQuery(query, params);
};

/**
 * Get purposes attached to a returns format
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @return {Promise} resolves with array of DB records
 */
const getFormatPurposes = (formatId, regionCode) => {
  const query = `
  SELECT p.* FROM "import"."NALD_RET_FMT_PURPOSES" p
  WHERE p."ARTY_ID"=$1 AND p."FGAC_REGION_CODE"=$2`;
  const params = [formatId, regionCode];
  return dbQuery(query, params);
};

/**
 * Get points attached to a returns format
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @return {Promise} resolves with array of DB records
 */
const getFormatPoints = (formatId, regionCode) => {
  const query = `
  SELECT p.*
  FROM "import"."NALD_RET_FMT_POINTS" fp
  LEFT JOIN "import"."NALD_POINTS" p ON fp."AAIP_ID"=p."ID" AND fp."FGAC_REGION_CODE"=p."FGAC_REGION_CODE"
  WHERE fp."ARTY_ID"=$1 AND fp."FGAC_REGION_CODE"=$2`;
  const params = [formatId, regionCode];
  return dbQuery(query, params);
};

/**
 * Get form logs for specified return format
 * @param {Number} formatId - the ARTY_ID
 * @return {Promise} resolves with array of DB records
 */
const getLogs = (formatId, regionCode) => {
  const query = `
  SELECT l.* FROM "import"."NALD_RET_FORM_LOGS" l
  WHERE l."ARTY_ID"=$1 AND l."FGAC_REGION_CODE"=$2
  ORDER BY to_date(l."DATE_FROM", 'DD/MM/YYYY')`;
  const params = [formatId, regionCode];
  return dbQuery(query, params);
};

/**
 * Get returns lines
 * @param {Number} formatId - the ARTY_ID=
 * @param {Number} region code - FGAC_REGION_CODE
 * @param {String} dateFrom - e.g. DD/MM/YYYY
 * @return {Promise} resolves with array of DB records
 */
const getLines = (formatId, regionCode, dateFrom) => {
  const m = moment(dateFrom, 'DD/MM/YYYY');
  const from = m.format('YYYYMMDD') + '000000';
  const query = `
  SELECT l.* FROM "import"."NALD_RET_LINES" l
  WHERE l."ARFL_ARTY_ID"=$1 AND l."FGAC_REGION_CODE"=$2 AND "ARFL_DATE_FROM"=$3
  ORDER BY "RET_DATE"`;
  const params = [formatId, regionCode, from];
  return dbQuery(query, params);
};

module.exports = {
  getFormats,
  getFormatPurposes,
  getFormatPoints,
  getLogs,
  getLines
};
