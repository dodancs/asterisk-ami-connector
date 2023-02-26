/**
 * Created by Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */
import * as net from 'net';
import { AmiEvent, AmiEventsStream } from "@dodancs/asterisk-ami-events-stream";
import amiUtils from "@dodancs/asterisk-ami-event-utils";
import { EventEmitter } from "events";

/**
 * Ami Connection
 */
export default class AmiConnection extends EventEmitter {
    private _socket: any;
    private _isConnected: boolean;
    private _amiDataStream: AmiEventsStream;
    private _lastWroteData: any;

    constructor(socket: net.Socket) {
        super();

        this._amiDataStream = new AmiEventsStream(),
            this._isConnected = true,
            this._lastWroteData = null,
            this._socket = socket;

        this._socket
            .on("error", (error: Error | string) => this.emit("error", error))
            .on("close", () => this.close());

        this._socket.pipe(this._amiDataStream)
            .on("amiEvent", (event: AmiEvent) => this.emit("event", event))
            .on("amiResponse", (response: AmiEvent) => this.emit("response", response))
            .on("data", (chunk: Buffer) => this.emit("data", chunk))
            .on("error", (error: Error | string) => this.emit("error", error));
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
    public write(message: AmiEvent | string, callbackErr?: (error?: Error) => void) {
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
