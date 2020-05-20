
INTRODUCTION

This is a small open source project serving a secure REST API (using node.js) for translating 
data from the Sensative LoRa Strips (www.sensative.com). It can serve as reference for custom
translation work, or it can be used off-the-shelf as a microservice serving translations in 
your infrastructure.

See LICENSE.txt for license and copyright information (MIT based open source license).

SYSTEM REQUIREMENTS:

It is assumed you have node.js installed, and that you are using bash shell. 
It has been developed only on Mac OSX with node 13.8.0.

INSTALLATION:

1. Clone this repository
2. Obtain a certificate and key and put in in a cert folder within the repository
3. Either launch this using the serve.sh file or using command line or other method, pass PORT 
as environment parameter.

USE:

make requests to host:{PORT}/translate?p={LORA PORT}&d={HEXADECIMAL LORA PAYLOAD}

If the data is correct it will return a JSON encoded object representing the data sent from the 
LoRa Strip.

API KEYS (OPTIONAL):

Additionally, should you wish you can add rudimentary API key handling to manage who can make 
calls to this API. The API keys are intended to be secret but not severely secret since this 
only prevents decoding (the HTTPS layer is responsible for data security). In this case, add a 
folder apikeys in the installation directory. Should it be there and be non-empty, all of the 
file names in there will serve as API keys (which can be added or removed if a particular key 
holder is added or barred). Do not use the same key for different key holders.

In this case, a new parameter k is read, and matched against the file names in the apikeys 
folder.

Example: host:{PORT}/translate?p={LORA PORT}&d={HEXADECIMAL LORA PAYLOAD}&k={key, e.g. a base64 encoded hash}

EXAMPLE:

Using a self-generated certificate, an apikeys folder containing a file examplekey2 and PORT 
being set to 38111.

URL: https://localhost:38111/translate?p=1&d=ffff1201&k=examplekey2
RESULT: {"historySeqNr":65535,"prevHistSeqNr":65535,"presence":{"value":true}}
