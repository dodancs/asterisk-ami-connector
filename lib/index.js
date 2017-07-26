"use strict";
/**
 * Created by Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */
Object.defineProperty(exports, "__esModule", { value: true });
const co = require("co");
const net = require("net");
const debug = require("debug");
const local_asterisk_ami_event_utils_1 = require("local-asterisk-ami-event-utils");
const local_asterisk_ami_events_stream_1 = require("local-asterisk-ami-events-stream");
const AmiConnection_1 = require("./AmiConnection");
const AmiAuthError_1 = require("./errors/AmiAuthError");
const debugLog = debug("amiConnector");
const errorLog = debug("amiConnector:error");
function createAmiConnection(login, secret, connectionOptions) {
    return new Promise((resolve, reject) => {
        const amiDataStream = new local_asterisk_ami_events_stream_1.default();
        const authCommand = {
            Action: "login",
            ActionID: `__auth_${Date.now()}__`,
            Secret: secret,
            Username: login
        };
        let amiSocket = null;
        debugLog("connecting to asterisk ami...");
        amiSocket = net.connect(connectionOptions, () => {
            debugLog("connection established");
            amiSocket.pipe(amiDataStream)
                .once("error", reject)
                .once("close", () => reject(new AmiAuthError_1.default("ami auth error")))
                .on("amiResponse", (response) => {
                if (response.ActionID !== authCommand.ActionID) {
                    return;
                }
                if (response.Response !== "Success") {
                    reject(new AmiAuthError_1.default(`AMI message: ${response.Message}`));
                    return;
                }
                debugLog("authontificated successfull");
                amiSocket
                    .removeAllListeners("error")
                    .removeAllListeners("close")
                    .unpipe(amiDataStream);
                amiDataStream
                    .removeAllListeners("error")
                    .removeAllListeners("close")
                    .removeAllListeners("amiResponse");
                resolve(new AmiConnection_1.default(amiSocket));
                debugLog("asterisk's ami connection ready to work");
            });
            debugLog(`authontification [username:${authCommand.Username}]...`);
            amiSocket.write(local_asterisk_ami_event_utils_1.default.fromObject(authCommand));
        })
            .once("error", reject)
            .once("close", reject);
    });
}
/**
 *
 * @param maxAttemptsCount
 * @param attemptsDelay
 * @returns {Function}
 */
function wrapper(maxAttemptsCount, attemptsDelay) {
    return (login, secret, connectionOptions) => {
        return co(function* () {
            let currAttemptIndex = 0;
            while (maxAttemptsCount === null || ++currAttemptIndex <= maxAttemptsCount) {
                try {
                    return yield createAmiConnection(login, secret, connectionOptions);
                }
                catch (error) {
                    if (error instanceof AmiAuthError_1.default) {
                        throw error;
                    }
                    errorLog(error.message);
                    yield sleep(attemptsDelay);
                }
                if (maxAttemptsCount === null) {
                    debugLog(`attempt of reconnecting...`);
                }
                else {
                    debugLog(`attempt [${currAttemptIndex} of ${maxAttemptsCount}] of reconnecting...`);
                }
            }
            throw new Error("Reconnection error after max count attempts.");
        });
    };
}
/**
 *
 * @param delay
 * @returns {Promise}
 */
function sleep(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}
const connector = (options) => {
    options = Object.assign({ attemptsDelay: 1000, maxAttemptsCount: null, reconnect: false }, (options || {}));
    return {
        connect: !options.reconnect ? createAmiConnection : wrapper(options.maxAttemptsCount, options.attemptsDelay)
    };
};
exports.default = connector;
//# sourceMappingURL=index.js.map