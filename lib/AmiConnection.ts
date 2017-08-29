/**
 * Created by Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */
import Socket = NodeJS.Socket;
import {EventEmitter} from "events";
import amiUtils from "local-asterisk-ami-event-utils";
import AmiEventsStream from "local-asterisk-ami-events-stream";

/**
 * Ami Connection
 */
export default class AmiConnection extends EventEmitter {
    private _socket: any;
    private _isConnected: boolean;
    private _amiDataStream: AmiEventsStream;
    private _lastWroteData: any;

    constructor(socket: Socket) {
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
    public close() {
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
    public write(message, callbackErr?: (error?: Error) => void) {
        const messageStr = typeof message === "string" ?
            amiUtils.fromString(message) : amiUtils.fromObject(message);

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
