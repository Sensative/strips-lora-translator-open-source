1. INTRODUCTION
This is a small open source project serving the purpose of interacting with Sensative AB 
Strips Lora sensor products. It examplifies using a secure REST API (using node.js) for translating 
data from the Sensative LoRa Strips (www.sensative.com). It can serve as reference for custom
translation work, or it can be used off-the-shelf as a microservice serving translations in 
your infrastructure. Additionally the code includes metadata for composing downlinks or 
translating them.

See LICENSE.txt for license and copyright information (MIT open source license).

The code comes in the following files:
  - raw-translate.js : Legacy version of the Strips translator. Reference design.
  - strips-translate.js : Data-driven version which also can decode downlinks.
  - cli.sh Command line tool to run either of the above, using the inclusion mechanism described below
  - serve.sh : Described in example below

2. SYSTEM REQUIREMENTS:
It is assumed you have node.js installed, and that you are using bash shell. 
Using it as npm/yarn package is also possible, see installation below.
It has been developed only on Mac OSX with node 13.8.0.

3. INSTALLATION:

Several possibilities exist:

For running as microservice, as is with example code as with serve.sh
1. Clone this repository
2. Obtain a certificate and key and put in in a cert folder within the repository
3. Either launch this using the serve.sh file or using command line or other method, pass PORT 
as environment parameter.

  or

Include this in your application by adding this dependency

 yarn add strips-lora-translator-open-source

  Then in your javascript file (example for command line use):

    const translator = require('strips-lora-translator-open-source');
    translator.commandLine(); // Example, you can also review this file to see how to directly access its functions.

  Or for inclusion in a web application

    import {decodeLoraStripsUplink, decodeLoraStripsDownlink} from 'strips-lora-translator-open-source/strips-translate';
    

4. EXAMPLE MICROSERVICE USAGE:

make requests to host:{PORT}/translate?p={LORA PORT}&d={HEXADECIMAL LORA PAYLOAD}

If the data is correct it will return a JSON encoded object representing the data sent to/from from the 
LoRa Strip.

4.1 API KEYS (OPTIONAL):

Additionally, should you wish you can add rudimentary API key handling to manage who can make 
calls to this API. The API keys are intended to be secret but not severely secret since this 
only prevents decoding (the HTTPS layer is responsible for data security). In this case, add a 
folder apikeys in the installation directory. Should it be there and be non-empty, all of the 
file names in there will serve as API keys (which can be added or removed if a particular key 
holder is added or barred). Do not use the same key for different key holders.

In this case, a new parameter k is read, and matched against the file names in the apikeys 
folder.

Example: host:{PORT}/translate?p={LORA PORT}&d={HEXADECIMAL LORA PAYLOAD}&k={key, e.g. a base64 encoded hash}

4.2 EXAMPLE:

Using a self-generated certificate, an apikeys folder containing a file examplekey2 and PORT 
being set to 38111.

URL: https://localhost:38111/translate?p=1&d=ffff1201&k=examplekey2
RESULT: {"historySeqNr":65535,"prevHistSeqNr":65535,"presence":{"value":true}}
