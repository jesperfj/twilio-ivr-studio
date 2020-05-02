const fs = require('fs')

async function install(app,argv) {
    const flows = await createFlows(app,argv)
    console.log(flows)
    console.log(`Allocating US phone number in 323 area code ($1/month) with callback to flow ${flows.ivr.sid}`)
    const result = await app.twilioClient.incomingPhoneNumbers.create({
        areaCode: '323',
        friendlyName: app.prefix,
        voiceUrl: `https://webhooks.twilio.com/v1/Accounts/${app.accountSid}/Flows/${flows.ivr.sid}`
    })
    console.log(`Allocated phone number ${result.phoneNumber}`)

}

async function uninstall(app,argv) {
    deleteFlows(app,argv)
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

async function createFlows(app,argv) {
    const flowFiles = fs.readdirSync("./flows")
    let flowResults = {}
    for(const fn of flowFiles) {
        const flowDefinition = JSON.parse(fs.readFileSync(`./flows/${fn}`));
        const flowName = fn.split('.')[0]
        console.log(`Creating flow ${app.prefix}-${flowName}`)
        const res = await app.twilioClient.studio.v2.flows.create({
            commitMessage: "twilioapp install",
            friendlyName: `${app.prefix}-${flowName}`,
            status: 'published',
            definition: flowDefinition
        })
        flowResults[flowName] = res
    }
    return flowResults
}

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

module.exports = {
    install,
    uninstall,
    createFlows,
    deleteFlows,
    pullFlows,
    editFlow,
    tester
}