"use strict";
/**
 * Developer: Alex Voronyansky <belirafon@gmail.com>
 * Date: 16.03.2015
 * Time: 18:33
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *  Asterisk authorization errorLog
 */
class AmiAuthError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
    }
}
exports.default = AmiAuthError;
//# sourceMappingURL=AmiAuthError.js.map