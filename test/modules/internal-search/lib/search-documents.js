const sinon = require('sinon');
const {
  experiment,
  test,
  beforeEach,
  afterEach
} = exports.lab = require('@hapi/lab').script();
const { expect, fail } = require('@hapi/code');

const documents = require('../../../../src/lib/connectors/crm/documents');
const { mapRow, searchDocuments } = require('../../../../src/modules/internal-search/lib/search-documents');

experiment('modules/internal-search/lib/search-documents', () => {
  let row;

  beforeEach(async () => {
    row = {
      document_id: 'abc',
      system_external_id: '01/123/456',
      metadata: {
        Name: 'Doe',
        Initials: 'J',
        Forename: 'John',
        Salutation: 'Mr',
        Expires: '20190205',
        IsCurrent: true
      },
      document_name: 'Fusty meadow'
    };
  });

  experiment('mapRow', () => {
    test('It should map a row of data from the CRM documents API', async () => {
      const mapped = mapRow(row);
      expect(mapped).to.equal({
        documentId: row.document_id,
        licenceNumber: row.system_external_id,
        licenceHolder: 'Mr J Doe',
        documentName: row.document_name,
        expires: '2019-02-05',
        isCurrent: true
      });
    });

    test('throws an error if the metadata is undefined', async () => {
      delete row.metadata;

      try {
        mapRow(row);
        fail('Should not get here');
      } catch (e) {
        expect(e.message).to.equal('No metadata for document');
        expect(e.params.documentId).to.equal(row.document_id);
        expect(e.params.licenceRef).to.equal(row.system_external_id);
      }
    });
  });

  experiment('searchDocuments', () => {
    let stub;

    afterEach(async () => {
      stub.restore();
    });

    test('It should throw an error if an error returned by the API', async () => {
      stub = sinon.stub(documents, 'findMany').resolves({ error: 'Some error' });
      expect(searchDocuments('01/123')).to.reject();
    });

    test('It should call the API with the correct arguments', async () => {
      stub = sinon.stub(documents, 'findMany').resolves({ data: [] });
      searchDocuments('01/123', 5);
      const [filter, sort, pagination, columns] = stub.firstCall.args;
      expect(filter).to.equal({
        string: '01/123',
        includeExpired: true
      });
      expect(sort).to.equal({ system_external_id: 1 });
      expect(pagination.page).to.equal(5);
      expect(columns).to.equal([
        'document_id',
        'system_external_id',
        'metadata',
        'document_name'
      ]);
    });

    test('It should return pagination object and mapped data from API call', async () => {
      const pagination = { page: 5, perPage: 50 };
      stub = sinon.stub(documents, 'findMany').resolves({
        data: [row], pagination
      });
      const result = await searchDocuments('01/123', 5);

      expect(Object.keys(result).sort()).to.equal(['data', 'pagination']);
      expect(result.data[0]).to.be.an.object();
      expect(result.pagination).to.equal(pagination);
    });
  });
});
