const Helpers = require('../../lib/helpers')
const DB = require('../../lib/connectors/db')

const Notify = require('../notify')
const crm = {
  documents: require('../../lib/connectors/crm/documents')
}
const Permit = require('../../lib/connectors/permit')
const moment = require('moment')

async function run(data) {
  //send request to CRM to select licences with expiry in the next N days

  //console.log(data)
  //http://127.0.0.1:8004/crm/1.0/expiring_licences?filter={"licence_type_id":8,"licence_regime_id":1}

  expiring = await Permit.expiringLicences.findMany()

//18/54/08/0538
  console.log(expiring)
  expiring.data.forEach(async(licence) => {
    //console.log(licence.licence_ref+' expires '+licence.licence_end_dt);

    responsedata = await crm.documents.getDocumentRoles({
      role: "primary_user",
      system_external_id: licence.licence_ref
    })

    if (responsedata.data[0] && responsedata.data[0].individual_nm) {
      const recipient = responsedata.data[0].individual_nm
//          console.log(licence.licence_ref+' got recipient for renewal email...' + recipient)
      try {
        const config = {
          id: `${licence.licence_ref}_${licence.licence_end_dt}_${recipient}`,
          recipient,
          message_ref: 'expiry_notification_email',
          personalisation: {
            "licence_no": licence.licence_ref
          },
          sendafter: moment().format('DD-MMM-YYYY HH:MM'),
        };
        getDocumentName = await crm.documents.getDocumentName(responsedata.data[0].document_id)
        try{
          config.personalisation.licence_name=getDocumentName.data[0].value
        } catch(e){
          config.personalisation.licence_name='';
        }
        Notify.sendLater(config)
      } catch (e) {
        console.log(e)
      }
    } else {
//          console.log(licence.licence_ref+' no primary user for this licence, cannot notify anybody ::sadface::')
    }


  });


  //get contact details for those licences



  //check if notification has been sent


  //schedule notifications
  return {
    error: null
  }
}

module.exports = {
  run
}