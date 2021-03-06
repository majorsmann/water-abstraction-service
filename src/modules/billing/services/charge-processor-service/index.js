const { groupBy, compact, mapValues } = require('lodash');
const validators = require('../../../../lib/models/validators');
const { NotFoundError } = require('../../../../lib/errors');

const Batch = require('../../../../lib/models/batch');
const FinancialYear = require('../../../../lib/models/financial-year');
const InvoiceLicence = require('../../../../lib/models/invoice-licence');

const dateHelpers = require('./lib/date-helpers');
const crmHelpers = require('./lib/crm-helpers');
const helpers = require('@envage/water-abstraction-helpers');
const transactionsProcessor = require('./transactions-processor');

const mappers = require('../../mappers');

// Services
const chargeVersionService = require('../../services/charge-version-service');
const batchService = require('../../services/batch-service');
const billingVolumeService = require('../../services/billing-volumes-service');

/**
 * Gets dates for charge period start and end date functions
 * @param {FinancialYear} financialYear
 * @param {ChargeVersion} chargeVersion
 * @param {Boolean} isStartDate
 */
const getDates = (financialYear, chargeVersion, isStartDate = true) => {
  const dateType = isStartDate ? 'start' : 'end';
  const dateRef = `${dateType}Date`;
  return [
    chargeVersion.licence[dateRef],
    financialYear[dateType],
    chargeVersion.dateRange[dateRef]
  ];
};

const getChargePeriodStartDate = (financialYear, chargeVersion) => dateHelpers.getMaxDate(
  getDates(financialYear, chargeVersion)).format('YYYY-MM-DD');

const getChargePeriodEndDate = (financialYear, chargeVersion) => dateHelpers.getMinDate(
  getDates(financialYear, chargeVersion, false)).format('YYYY-MM-DD');

/**
 * Given CRM company data and the charge version being processed,
 * gets an InvoiceLicence instance
 * @param {Object} company - data from CRM
 * @param {ChargeVersion} chargeVersion
 */
const createInvoiceLicence = (company, chargeVersion, licenceHolderRole) => {
  const invoiceLicence = new InvoiceLicence();
  return invoiceLicence.fromHash({
    licence: chargeVersion.licence,
    company: mappers.company.crmToModel(company),
    contact: mappers.contact.crmToModel(licenceHolderRole.contact),
    address: mappers.address.crmToModel(licenceHolderRole.address)
  });
};

/**
 * Checks if any transactions in the invoice licence have the
 * isTwoPartTariffSupplementary flag set to true
 * @param {InvoiceLicence} invoiceLicence
 * @return {Boolean}
 */
const hasTptSupplementaryTransactions = invoiceLicence => {
  const tptSupplementaryTransactions = invoiceLicence.transactions.filter(
    transaction => transaction.isTwoPartTariffSupplementary);

  return tptSupplementaryTransactions.length > 0;
};

/**
 * Collates charge element data required for returns matching
 * @param {Transaction} transaction
 * @param {FinancialYear} financialYear
 * @param {ChargeVersion} chargeVersion
 * @param {Moment} chargePeriodStartDate
 * @return {Object}
 */
const getChargeElementsForMatching = (transactions, financialYear, chargeVersion, chargePeriodStartDate) => {
  const chargePeriodEndDate = getChargePeriodEndDate(financialYear, chargeVersion);
  const chargeElements = chargeVersion.chargeElements.map(chargeElement => {
    const transaction = transactions.find(transaction => transaction.chargeElement.id === chargeElement.id);
    if (transaction) {
      return {
        ...chargeElement.toJSON(),
        startDate: chargePeriodStartDate,
        endDate: chargePeriodEndDate,
        billableDays: transaction.billableDays,
        authorisedDays: transaction.authorisedDays,
        totalDays: helpers.charging.getTotalDays(chargePeriodStartDate, chargePeriodEndDate)
      };
    }
  });
  return compact(chargeElements);
};

const getChargeElementGroup = chargeElement => chargeElement.season === 'summer' ? 'summer' : 'winter/all-year';

/**
 * Creates the invoice data structure for a given charge version year
 * @param {Batch} batch
 * @param {FinancialYear} financialYear
 * @param {String} chargeVersionId
 * @return {Promise<Invoice>}
 */
const processChargeVersionYear = async (batch, financialYear, chargeVersionId) => {
  validators.assertIsInstanceOf(batch, Batch);
  validators.assertIsInstanceOf(financialYear, FinancialYear);
  validators.assertId(chargeVersionId);

  // Load ChargeVersion service model
  const chargeVersion = await chargeVersionService.getByChargeVersionId(chargeVersionId);
  if (!chargeVersion) {
    throw new NotFoundError(`Charge version ${chargeVersionId} not found`);
  }

  // Get charge period start date
  const chargePeriodStartDate = getChargePeriodStartDate(financialYear, chargeVersion);

  // Load company/invoice account/licence holder data from CRM
  const [company, invoiceAccount, licenceHolderRole] = await crmHelpers.getCRMData(chargeVersion, chargePeriodStartDate);

  const sentTPTBatches = await batchService.getSentTPTBatchesForFinancialYearAndRegion(financialYear, batch.region);

  // Generate Invoice data structure
  const invoice = mappers.invoice.crmToModel(invoiceAccount);
  invoice.financialYear = financialYear;
  const invoiceLicence = createInvoiceLicence(company, chargeVersion, licenceHolderRole);
  invoiceLicence.transactions = transactionsProcessor.createTransactions(batch, financialYear, chargeVersion, sentTPTBatches);
  invoice.invoiceLicences = [invoiceLicence];

  // Generate billing volumes if transactions are TPT supplementary
  if (hasTptSupplementaryTransactions(invoiceLicence)) {
    const chargeElements = getChargeElementsForMatching(invoiceLicence.transactions, financialYear, chargeVersion, chargePeriodStartDate);
    const chargeElementsBySeason = groupBy(chargeElements, getChargeElementGroup);

    const tasks = mapValues(chargeElementsBySeason, (chargeElements, season) => {
      const isSummer = season === 'summer';
      return billingVolumeService.getVolumes(chargeElements, chargeVersion.licence.licenceNumber, financialYear.yearEnding, isSummer, batch);
    });

    await Promise.all(Object.values(tasks));
  }

  return invoice;
};

exports.processChargeVersionYear = processChargeVersionYear;
