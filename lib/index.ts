/**
 * Created by Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */

import co = require("co");
import net = require("net");
import debug  = require("debug");
import Socket = NodeJS.Socket;
import amiUtils from "local-asterisk-ami-event-utils";
import AmiEventsStream from "local-asterisk-ami-events-stream";
import AmiConnection from "./AmiConnection";
import AmiAuthError from "./errors/AmiAuthError";
import {IAmiConnectionOptions, TAmiConnection, TAmiConnector} from "./interfaces";

const debugLog = debug("amiConnector");
const errorLog = debug("amiConnector:error");

function createAmiConnection(login: string, secret: string, connectionOptions: IAmiConnectionOptions): Promise<AmiConnection> {
    return new Promise((resolve, reject) => {

        const amiDataStream: AmiEventsStream = new AmiEventsStream();
        const authCommand = {
            Action: "login",
            ActionID: `__auth_${Date.now()}__`,
            Secret: secret,
            Username: login
        };
        let amiSocket: Socket = null;

        debugLog("connecting to asterisk ami...");

        amiSocket = net.connect(connectionOptions, () => {
            debugLog("connection established");

            amiSocket.pipe(amiDataStream)
                .once("error", reject)
                .once("close", () => reject(new AmiAuthError("ami auth error")))
                .on("amiResponse", (response) => {
                    if (response.ActionID !== authCommand.ActionID) {
                        return;
                    }
                    if (response.Response !== "Success") {
                        reject(new AmiAuthError(`AMI message: ${response.Message}`));
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

                    resolve(new AmiConnection(amiSocket));
                    debugLog("asterisk's ami connection ready to work");
                });
            debugLog(`authontification [username:${authCommand.Username}]...`);
            amiSocket.write(amiUtils.fromObject(authCommand));
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
function wrapper(maxAttemptsCount?: number, attemptsDelay?: number): TAmiConnection {
    return (login: string, secret: string, connectionOptions: IAmiConnectionOptions): Promise<AmiConnection> => {
        return co(function* () {
            let currAttemptIndex = 0;

            while (maxAttemptsCount === null || ++currAttemptIndex <= maxAttemptsCount) {
                try {
                    return yield createAmiConnection(login, secret, connectionOptions);

                } catch (error) {
                    if (error instanceof AmiAuthError) {
                        throw error;
                    }

                    errorLog(error.message);
                    yield sleep(attemptsDelay);
                }

                if (maxAttemptsCount === null) {
                    debugLog(`attempt of reconnecting...`);
                } else {
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

const connector: TAmiConnector = (options): { connect: TAmiConnection } => {
    options = {
        attemptsDelay: 1000,
        maxAttemptsCount: null,
        reconnect: false,
        ...(options || {})
    };

    return {
        connect: !options.reconnect ? createAmiConnection : wrapper(options.maxAttemptsCount, options.attemptsDelay)
    };
};

export default connector;