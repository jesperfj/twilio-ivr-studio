# Twilio Studio IVR quick deploy

This repo demonstrates a quick deploy app that uses Twilio Studio to implement an IVR flow. It takes advantage of the new beta Studio REST API which allows Studio flows to be read and written as json objects via REST API. This allows you to manage changes to flows via a git repo like this.

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

## Uninstall

Uninstall the app with

    $ twilio twilioapp:uninstall

This will delete the Studio flow, Serverless service and release the phone number.
