/**
 * Created by Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */

import * as net from "net";
import * as co from "co";
import amiUtils from "@dodancs/asterisk-ami-event-utils";
import { AmiEvent, AmiEventsStream } from "@dodancs/asterisk-ami-events-stream";
import AmiConnection from "./AmiConnection";
import AmiAuthError from "./errors/AmiAuthError";
import { IAmiConnectionOptions, TAmiConnection, TAmiConnector } from "./interfaces";

function createAmiConnection(login: string, secret: string, connectionOptions: IAmiConnectionOptions): Promise<AmiConnection> {
    return new Promise((resolve, reject) => {

        const amiDataStream: AmiEventsStream = new AmiEventsStream();
        const authCommand: AmiEvent = {
            Action: "login",
            ActionID: `__auth_${Date.now()}__`,
            Secret: secret,
            Username: login
        };
        let amiSocket: net.Socket;

        console.debug("connecting to asterisk ami...");

        amiSocket = net.connect(connectionOptions, () => {
            console.debug("connection established");

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

                    console.debug("authontificated successfull");
                    amiSocket
                        .removeAllListeners("error")
                        .removeAllListeners("close")
                        .unpipe(amiDataStream);

                    amiDataStream
                        .removeAllListeners("error")
                        .removeAllListeners("close")
                        .removeAllListeners("amiResponse");

                    resolve(new AmiConnection(amiSocket));
                    console.debug("asterisk's ami connection ready to work");
                });
            console.debug(`authontification [username:${authCommand.Username}]...`);
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
function wrapper(maxAttemptsCount: number | null | undefined, attemptsDelay?: number): TAmiConnection {
    return (login: string, secret: string, connectionOptions: IAmiConnectionOptions): Promise<AmiConnection> => {
        return co(function* () {
            let currAttemptIndex = 0;

            while (maxAttemptsCount === null || ++currAttemptIndex <= (maxAttemptsCount || 0)) {
                try {
                    return yield createAmiConnection(login, secret, connectionOptions);

                } catch (error) {
                    if (error instanceof AmiAuthError) {
                        throw error;
                    }

                    if (error instanceof Error) {
                        console.error(error.message);
                    }
                    yield sleep(attemptsDelay);
                }

                if (maxAttemptsCount === null) {
                    console.debug(`attempt of reconnecting...`);
                } else {
                    console.debug(`attempt [${currAttemptIndex} of ${maxAttemptsCount}] of reconnecting...`);
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
function sleep(delay?: number) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

const connector: TAmiConnector = (options?): { connect: TAmiConnection; } => {
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
