/**
 * Developer: Alex Voronyansky <belirafon@gmail.com>
 * Date: 16.03.2015
 * Time: 18:33
 */

/**
 *  Asterisk authorization errorLog
 */
export default class AmiAuthError extends Error {

    constructor(message: string) {
        super(message);
        this.message = message;
    }
}
