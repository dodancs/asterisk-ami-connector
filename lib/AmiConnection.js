"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AmiEventsStream = require("asterisk-ami-events-stream");
const dfi_asterisk_ami_event_utils_1 = require("dfi-asterisk-ami-event-utils");
const events_1 = require("events");
/**
 * Ami Connection
 */
class AmiConnection extends events_1.EventEmitter {
    constructor(socket) {
        super();
        Object.assign(this, {
            _amiDataStream: new AmiEventsStream(),
            _isConnected: true,
            _lastWroteData: null,
            _socket: socket
        });
        this._socket
            .on("error", (error) => this.emit("error", error))
            .on("close", () => this.close());
        this._socket.pipe(this._amiDataStream)
            .on("amiEvent", (event) => this.emit("event", event))
            .on("amiResponse", (response) => this.emit("response", response))
            .on("data", (chunk) => this.emit("data", chunk))
            .on("error", (error) => this.emit("error", error));
    }
    /**
     *
     * @returns {AmiConnection}
     */
    close() {
        this._isConnected = false;
        this.emit("close");
        if (this._socket) {
            this._socket.unpipe(this._amiDataStream);
            this._socket
                .removeAllListeners("end")
                .removeAllListeners("close")
                .removeAllListeners("errorLog")
                .destroy();
        }
        return this;
    }
    /**
     *
     * @param message
     */
    write(message, callbackErr) {
        const messageStr = typeof message === "string" ?
            dfi_asterisk_ami_event_utils_1.default.fromString(message) : dfi_asterisk_ami_event_utils_1.default.fromObject(message);
        this._lastWroteData = message;
        return this._socket.write(messageStr, callbackErr);
    }
    /**
     *
     * @returns {boolean}
     */
    get isConnected() {
        return this._isConnected;
    }
    /**
     *
     * @returns {null}
     */
    get lastEvent() {
        return this._amiDataStream ? this._amiDataStream.lastEvent : null;
    }
    /**
     *
     * @returns {null}
     */
    get lastResponse() {
        return this._amiDataStream ? this._amiDataStream.lastResponse : null;
    }
    /**
     *
     * @returns {*}
     */
    get lastWroteData() {
        return this._lastWroteData;
    }
}
exports.default = AmiConnection;
//# sourceMappingURL=AmiConnection.js.map