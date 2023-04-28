import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import axios from 'axios'

export default class EmailListVerify {
    apiKey = null
    baseUrl = 'https://apps.emaillistverify.com/api'
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error(`API key is required. Visit https://apps.emaillistverify.com/api to get your API key.`)
        }
        this.apiKey = apiKey
    }

    async bulkUpload(filePath) {
        if (!filePath) {
            throw new Error(`Missing File Path`)
        }
        let fileName = path.basename(filePath)
        let fileContents = fs.readFileSync(filePath)

        const form = new FormData();
        form.append('file_contents', fileContents, fileName);
        let url = `${this.baseUrl}/verifApiFile?secret=${this.apiKey}&filename=${fileName}`
        const response = await axios.post(url, form, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        switch(response.data){
            case 'no_credit':
                throw new Error('Insufficient credits. Your current account balance is $0')
            case 'cannot_upload_file':
                throw new Error('The uploaded file could not be processed due to incorrect formatting or broken upload.')
            case 'key_not_valid':
                throw new Error('Invalid API Key')
            case 'missing parameters':
                throw new Error('Missing parameters')
            default:
                return {fileId: parseInt(response.data)}
        }
    }

    async checkStatus(fileId) {
        if (!fileId) {
            throw new Error(`Missing File ID`)
        }
        fileId = parseInt(fileId)
        let url = `${this.baseUrl}/getApiFileInfo?secret=${this.apiKey}&id=${fileId}`
        let res = null
        try {
            res = await axios.get(url)
        } catch (e) {
            switch (e.response.status) {
                case 404:
                    throw new Error(`Invalid File Id`)
            }
        }

        return this._parseStatusResults(res)
    }

    _parseStatusResults(responseData) {
        let data = responseData.data.split('|')
        if (data[0] === 'key_not_valid') {
            throw new Error(`Invalid API Key`)
        } else if (data[0] === 'missing_parameters') {
            throw new Error(`Missing File ID`)
        }

        return {
            fileId: parseInt(data[0]),
            filename: data[1],
            unique: data[2] === 'yes' ? true : false,
            totalLines: parseInt(data[3]),
            linesProcessed: parseInt(data[4]),
            percentageCompleted: parseInt(data[4]) / parseInt(data[3]),
            status: data[5],
            timestamp: new Date(parseInt(data[6]) * 1000),
            linkOk: data[8],
            linkAll: data[7],
        }
    }
}