This is a small open source project serving a secure REST API (using node.js) for translating the Sensative Strips.

See LICENSE.TXT for license and copyright information (MIT based open source license).

System requirements:

It is assumed you have node.js installed, and that you are using bash shell.

Installation:

1. Clone this repository
2. Obtain a certificate and key and put in in a cert folder within the repository
3. Either launch this using the serve.sh file or using command line or other method, pass PORT as environment parameter.

Use:

make requests to server:port/translate?p={LORA PORT}&d={HEXADECIMAL LORA PAYLOAD}

It will return a JSON encoded object representing the data sent from the LoRa Strip.
