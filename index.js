/**
 * @license
 * MIT License
 * Copyright (c) 2023 George Lejnine

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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

    /**
     * Verify a single email address.
     * @param {string} email The email to be verified
     * @param {number} timeout The maximum time in seconds to try to verify the address, defaults to 30 seconds
     * @returns {EmailVerificationStatus} 
     */
    async verifySingleEmail(email, timeout = 30) {
        let url = `${this.baseUrl}/verifyEmail?secret=${this.apiKey}&email=${email}&timeout=${timeout}`
        const response = await axios.get(url);
        switch (response.data) {
            case 'ok':
                return EmailListVerify.ok;
            case 'fail':
                return EmailListVerify.fail;
            case 'unknown':
                return EmailListVerify.unknown;
            case 'incorrect':
                return EmailListVerify.incorrect;
            case 'key_not_valid':
                throw new Error('Invalid API Key')
            case 'missing parameters':
                throw new Error('Missing parameters')
        }
    }

    /**
     * Enum of single email verifcation status
     * ok	The supplied email address has passed all verification tests
     * fail	The supplied email address has failed one or more tests
     * unknown	The supplied email address can not be accurately tested
     * incorrect	No email address was provided in the request or it contains a syntax error
     * @enum {string}
     */
    EmailVerificationStatus = {
        ok: 'ok',
        fail: 'fail',
        unknown: 'unknown',
        incorrect: 'incorrect'
    }

    /** 
     * Upload a CSV file with emails to perform bulk email verification.
     * See more details at https://www.emaillistverify.com/docs/#section/File-Verification
     * @param {string} filePath - The full path to the CSV file you want to upload and verify
     * @returns {number} - fileId to use in checkStatus
    */
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

        switch (response.data) {
            case 'no_credit':
                throw new Error('Insufficient credits. Your current account balance is $0')
            case 'cannot_upload_file':
                throw new Error('The uploaded file could not be processed due to incorrect formatting or broken upload.')
            case 'key_not_valid':
                throw new Error('Invalid API Key')
            case 'missing parameters':
                throw new Error('Missing parameters')
            default:
                return parseInt(response.data)
        }
    }


    /**
     * Checks the status of a bulk upload verifcation.
     * @param {number} fileId The fileId returned from bulkUpload
     * @returns {Promise<VerficationStatus>} 
     */
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


    /**
     * @typedef {Object} VerficationStatus
     * @property {number} fileId The fileId of the request
     * @property {string} fileName The original uploaded file name
     * @property {boolean} unique Indicates if the remove duplicates option was selected during file upload.
     * @property {number} totalLines Total number of parsed emails in the file.
     * @property {number} linesProcessed Number of emails processed so far
     * @property {number} percentageCompleted Percentage of file processed, range 0 - 1
     * @property {string} status File status. It will be one of "new", "parsing", "incorrect", "waiting", "progress", "suspended", "canceled", "finished".
     * @property {Date} timestamp Date when the file was uploaded
     * @property {string} linkOk Link to the report containing email addresses that have passed verification. Will be empty if the file has not finished processing.
     * @property {string} linkAll Link to the report containing all supplied email addresses. Will be empty if the file has not finished processing.
     */

    /**
     * @private
     * @returns {VerficationStatus}
     */
    _parseStatusResults(responseData) {
        let data = responseData.data.split('|')
        if (data[0] === 'key_not_valid') {
            throw new Error(`Invalid API Key`)
        } else if (data[0] === 'missing_parameters') {
            throw new Error(`Missing File ID`)
        }

        return {
            fileId: parseInt(data[0]),
            fileName: data[1],
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

