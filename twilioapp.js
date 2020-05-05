const fs = require('fs')

async function install(app,argv) {
    const flows = await pushFlows(app,argv)
    const voiceUrl = `https://webhooks.twilio.com/v1/Accounts/${app.accountSid}/Flows/${flows.ivr.sid}`
    console.log(flows)
    console.log(`Allocating US phone number in 323 area code ($1/month) with callback to flow ${flows.ivr.sid}`)
    const result = await app.twilioClient.incomingPhoneNumbers.create({
        areaCode: '323',
        friendlyName: app.prefix,
        voiceUrl: voiceUrl
    })
    console.log(`Allocated phone number ${result.phoneNumber}`)

    const sipDomain = await app.twilioClient.sip.domains.create({
        domainName: `${app.prefix}.sip.twilio.com`,
        friendlyName: app.prefix,
        voiceUrl: `https://webhooks.twilio.com/v1/Accounts/${app.accountSid}/Flows/${flows.ivr.sid}`
    })
    console.log(`SIP domain for sending calls to this IVR via SIP: ${sipDomain.sid}`)

}

async function uninstall(app,argv) {
    await deleteFlows(app,argv)
    console.log(`Looking for number ${app.prefix}`)
    const numbers = await app.twilioClient.incomingPhoneNumbers.list({ friendlyName: app.prefix })
    if(numbers.length==0) {
        console.log(`Phone number ${app.prefix} not found`)
    } else if(numbers.length>1) {
        console.log(`Found more than 1 phone number matching ${app.prefix}. Please review manually`)
        return
    } else {
        console.log(`Deleting phone number ${app.prefix}`)
        app.twilioClient.incomingPhoneNumbers(numbers[0].sid).remove()
    }
}

// These functions can be called with `twilio twilioapp:run <function-name>`.

async function deleteFlows(app,argv) {
    const flows = await app.twilioClient.studio.v2.flows.list()
    const flowFiles = fs.readdirSync("./flows")
    for(const fn of flowFiles) {
        const flowName = fn.split('.')[0]
        const flow = flows.find(elem => { return elem.friendlyName === `${app.prefix}-${flowName}` })
        if(flow) {
            console.log(`Deleting flow ${flow.friendlyName} with sid ${flow.sid}`)
            await app.twilioClient.studio.v2.flows(flow.sid).remove()
        }
    }
}

async function pushFlows(app,argv) {
    let flows = await app.twilioClient.studio.v2.flows.list()
    const flowFiles = fs.readdirSync("./flows")
    let flowResults = { updated: {}, created: {} }

    for(const fn of flowFiles) {
        const flowDefinition = JSON.parse(fs.readFileSync(`./flows/${fn}`));
        const flowName = fn.split('.')[0]
        const flow = flows.find(elem => { return elem.friendlyName === `${app.prefix}-${flowName}` })
        if(flow) {
            console.log(`Updating flow ${flowName}`)
            const res = await app.twilioClient.studio.v2.flows(flow.sid).update({
                commitMessage: "Update from twilioapp",
                status: 'published',
                definition: flowDefinition
            })
            flowResults.updated[flowName] = res
        } else {
            console.log(`Creating new flow ${flowName}`)
            const res = await app.twilioClient.studio.v2.flows.create({
                commitMessage: "Create from twilioapp",
                friendlyName: `${app.prefix}-${flowName}`,
                status: 'published',
                definition: flowDefinition
            })
            flowResults.created[flowName] = res
        }
    }
}

async function pullFlows(app,argv) {
    let flows = await app.twilioClient.studio.v2.flows.list()
    flows = flows.filter(elem => {
        return elem.friendlyName.startsWith(app.prefix)
    })
    for(const flow of flows) {
        const flowName = flow.friendlyName.split('-').pop()
        const flowDetail = await app.twilioClient.studio.v2.flows(flow.sid).fetch()
        console.log(`Pulling flow ${flowName}`)
        fs.writeFileSync(`./flows/${flowName}.json`,JSON.stringify(flowDetail.definition,null,2))
    }
}

async function editFlow(app,argv) {
    const flows = await app.twilioClient.studio.v2.flows.list()
    const flow = flows.find(elem => {
        return elem.friendlyName === `${app.prefix}-${argv[1]}`
    })
    if(flow) {
        execCmd(`open https://www.twilio.com/console/studio/flows/${flow.sid}`)
    } else {
        console.log("Flow not found")
    }
}

async function createSIPDomain(app,argv) {
    if(!argv[1]) {
        console.log("Studio flow not provided in first argument")
        return null
    }
    if(!argv[2]) {
        console.log("IP addresses not supplied when creating SIP domain")
        return null
    }
    const friendlyName = `${app.prefix}-${argv[1]}`
    const flows = await app.twilioClient.studio.v2.flows.list()
    const flow = flows.find(elem => { return elem.friendlyName === friendlyName })
    if(!flow) {
        console.log("Flow not found")
        return null
    }
    const ipacl = await app.twilioClient.sip.ipAccessControlLists
        .create({friendlyName: friendlyName })

    for(let i=2;i<argv.length;i++) {
        console.log(`Adding ip address ${argv[i]} to whitelist`)
        const ipaddr = await app.twilioClient.sip.ipAccessControlLists(ipacl.sid).ipAddresses
            .create({friendlyName: friendlyName, ipAddress: argv[i]})
    }

    console.log("Creating domain "+friendlyName)
    const sipDomain = await app.twilioClient.sip.domains.create({
        domainName: `${app.prefix}-${argv[1]}.sip.twilio.com`,
        friendlyName: `${app.prefix}-${argv[1]}`,
        voiceUrl: `https://webhooks.twilio.com/v1/Accounts/${app.accountSid}/Flows/${flow.sid}`
    })
    console.log(`SIP domain created pointing to Studio flow ${argv[1]}: ${sipDomain}`)
    console.log("Get details with twilio command:")
    console.log(`twilio api:core:sip:domains:fetch --sid ${sipDomain.sid} -o json`)
    const ipaclmap = await app.twilioClient.sip.domains(sipDomain.sid)
        .auth
        .calls
        .ipAccessControlListMappings
        .create({ipAccessControlListSid: ipacl.sid})

    console.log(`IP access control list ${ipacl.sid} mapped to SIP domain ${sipDomain.sid}`)
    return sipDomain
}

async function deleteSIPDomain(app,argv) {
    const domains = await app.twilioClient.sip.domains.list()
    console.log(`Deleting SIP domain with friendly name ${app.prefix}-${argv[1]}`)
    const domain = domains.find(elem => {
        return elem.friendlyName === `${app.prefix}-${argv[1]}`
    })
    if(domain) {
        const res = await app.twilioClient.sip.domains(domain.sid).remove()
        console.log("Deleted: "+res)
    } else {
        console.log("Domain not found")
    }
    const ipacls = await app.twilioClient.sip.ipAccessControlLists.list()
    const ipacl = ipacls.find(elem => {
        return elem.friendlyName === `${app.prefix}-${argv[1]}`
    })
    if(ipacl) {
        const res = await app.twilioClient.sip.ipAccessControlLists(ipacl.sid).remove()
        console.log("Deleted: "+res)
    } else {
        console.log("IpACL not found")
    }
    
}

async function tester(app,argv) {
    console.log(app.accountSid)
}

async function execCmd(cmd) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
     exec(cmd, (code, stdout, stderr) => {
      if (code) {
       console.warn(code);
      }
      resolve({code: code, stdout: stdout, stderr: stderr});
     });
    });
}

function findByFriendlyName(list, name) {
    return list.find(elem => {
        return elem.friendlyName === name
    })
}

module.exports = {
    install,
    uninstall,
    deleteFlows,
    pullFlows,
    pushFlows,
    editFlow,
    createSIPDomain,
    deleteSIPDomain,
    tester
}