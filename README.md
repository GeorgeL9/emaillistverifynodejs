# EmailListVerify API for Node.js
Node.js utility library to use the EmailListVerify.com API

## Installing
Using npm:

```bash
$ npm install emaillistverifynodejs
```

# Usage
### Basic setup
```
import EmailListVerify from "emaillistverifynodejs";

let apiKey = "YOUR_API_KEY"
let emlClient = new EmailListVerify(apiKey)
```

## Verify a single email
```
await emlClient.verifySingleEmail('test@gmail.com')
```
## Verify bulk email list from CSV file
First you will need to upload the csv file to EmailListVerify and you will get a `fileId` back as a response. 

Store this fileId as you will need it to check the status of the verification process.
```
let filedId = await emlClient.bulkUpload('/path/to/emails.csv')
```

Then you can check the progress of the verifcation:
```
let response = await emlClient.checkStatus(fileId)
```

Once `response.status` is `finished` you can download the verified email list from the `response.linkOk` or `response.linkAll` url's.