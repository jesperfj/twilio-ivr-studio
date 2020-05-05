# Twilio Studio IVR quick deploy

This repo demonstrates a quick deploy app that uses Twilio Studio to implement an IVR flow. It takes advantage of the [new beta Studio REST API](https://www.twilio.com/blog/automate-flow-deployments-studio-rest-api-v2-beta) which allows Studio flows to be read and written as json objects via REST API. This allows you to manage changes to flows via a git repo like this.

### Caveat

This is a very quick and dirty concept meant to spark ideas of what's possible with the new Studio APIs. Edge cases are not handled and nothing has been hardened.

## Pre-requisites

[Sign up for a Twilio account](https://www.twilio.com/try-twilio) if you don't have one. Your computer must have [Node.js v10](https://nodejs.org/en/download/) or higher. Install Twilio CLI with

    $ npm install -g twilio-cli

Install the CLI installer plugin with

    $ twilio plugins:install https://github.com/jesperfj/plugin-twilioapp

It will prompt for a y/N since this is an untrusted installation source.

## Install the IVR app on Twilio

Clone this repo to your computer and open a terminal in the repo directory. Run

    $ twilio twilioapp:install

This will do the following

* Create a new serverless service on Twilio and deploy  the dummy function `default.protected.js`. It doesn't do anything at the moment.
* Deploy the `flows/ivr.json` Studio flow to Twilio.
* Allocate a dedicated phone number to this IVR, costing $1 / month

## Test

Test the flow by calling the number that was printed after install completed.

## Uninstall

Uninstall the app with

    $ twilio twilioapp:uninstall

This will delete the Studio flow, Serverless service and release the phone number.

## Edit a flow

It's easiest to edit a flow from the Studio editor console. Open the editor on the 'ivr' flow with:

    $ twilio twilioapp:run editFlow ivr

As you create more flows you can open them by name in a similar way.

## Pull changes

When you have made changes to a flow in the Studio editor, you can pull them down with

    $ twilio twilioapp:run pullFlows

This will overwrite local files in the `flows` directory with flows you have edited in Twilio. Assuming you have your local flows committed to git, you can use `git diff` to see changes.

## Push flows

If you make local changes to your flows, you can push them to Twilio with

    $ twilio twilioapp:run pushFlows

