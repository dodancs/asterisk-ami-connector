/**
 * Developer: BelirafoN
 * Date: 05.05.2016
 * Time: 11:26
 */
import AmiTestServer from "local-asterisk-ami-test-server";
import * as assert from "assert";
import AmiConnection from "../lib/AmiConnection";

import connectorFactory from "../lib/index";

const CRLF = "\r\n";

const serverOptions = {
    credentials: {
        secret: "test",
        username: "test"
    }
};
const socketOptions = {
    host: "127.0.0.1",
    port: 50380
};

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
    // application specific logging, throwing an error, or other logic here
});

describe("Ami connector Internal functioanlity", () => {

    function onBefore() {
        this.timeout(3000);
    }

    let server = null;
    let connector = null;
    const connectorOptions = {
        attemptsDelay: 1000,
        maxAttemptsCount: null,
        reconnect: false
    };
    before(onBefore);

    afterEach((done) => {
        if (server instanceof AmiTestServer) {
            server.close();
            server.removeAllListeners();
            server = null;
        }
        connector = null;
        done();
    });

    describe("Regular connection functionality", () => {

        beforeEach((done) => {
            connector = connectorFactory(connectorOptions);
            server = new AmiTestServer(serverOptions);
            server.listen({port: socketOptions.port})
                .then(() => {
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Connect without reconnection & correct credentials", (done) => {
            connector.connect("test", "test", socketOptions)
                .then(() => {
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Connector returns instance of AmiConnection", (done) => {
            connector.connect("test", "test", socketOptions)
                .then((amiConnection) => {
                    assert.ok(amiConnection instanceof AmiConnection);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it("Connect without reconnection & invalid credentials", (done) => {
            connector.connect("username", "secret", socketOptions)
                .catch((error) => {
                    assert.ok(error instanceof Error);
                    assert.equal("ami message: authentication failed", error.message.toLowerCase());
                    done();
                });
        });
    });

    describe("Reconnection functioanlity", () => {

        beforeEach(() => {
            server = new AmiTestServer(serverOptions);
        });

        it("Reconnection with correct credentials", (done) => {
            connector = connectorFactory({
                reconnect: true
            });
            connector.connect("test", "test", socketOptions)
                .then(() => {
                    done();
                })
                .catch((error) => {
                    done(error);
                });
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        }).timeout(3000);

        it("Reconnection with invalid credentials", (done) => {
            connector = connectorFactory({
                reconnect: true
            });
            connector.connect("username", "secret", socketOptions)
                .catch((error) => {
                    assert.ok(error instanceof Error);
                    assert.equal("ami message: authentication failed", error.message.toLowerCase());
                    done();
                });
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        }).timeout(3000);

        it("Limit of attempts of reconnection", (done) => {
            connector = connectorFactory({
                maxAttemptsCount: 1,
                reconnect: true
            });
            connector.connect("test", "test", socketOptions)
                .catch((error) => {
                    assert.ok(error instanceof Error);
                    assert.equal("reconnection error after max count attempts.", error.message.toLowerCase());
                    done();
                });
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        });

        it("Ban for reconnection", (done) => {
            connector = connectorFactory({
                reconnect: false
            });
            connector.connect("test", "test", socketOptions)
                .catch((error) => {
                    assert.ok(error instanceof Error);
                    assert.equal("connect ECONNREFUSED 127.0.0.1:50380", error.message);
                    done();
                });
            setTimeout(() => {
                server.listen({port: socketOptions.port});
            }, 1500);
        });
    });

    describe("AmiConnection internal functionality", () => {
        let connection = null;

        beforeEach((done) => {
            connector = connectorFactory(connectorOptions);
            server = new AmiTestServer(serverOptions);
            server.listen({port: socketOptions.port})
                .then(() => {
                    connector.connect("test", "test", socketOptions)
                        .then((amiConnection) => {
                            connection = amiConnection;
                            done();
                        })
                        .catch((error) => {
                            done(error);
                        });
                })
                .catch((error) => {
                    done(error);
                });
        });

        afterEach(() => {
            if (connection instanceof AmiConnection) {
                connection.close();
                connection.removeAllListeners();
                connection = null;
            }
        });

        it("Last response", (done) => {
            connection
                .once("response", (response) => {
                    assert.deepEqual(connection.lastResponse, response);
                    done();
                })
                .write({Action: "Ping"});
        });

        it("Last event", (done) => {
            server.broadcast([
                "Event: Test",
                "Value: AmiConnectionTest"
            ].join(CRLF) + CRLF.repeat(2));

            connection.once("event", (event) => {
                assert.deepEqual(connection.lastEvent, event);
                done();
            });
        });

        it("Last wrote data", () => {
            const dataPackage = {Action: "Ping"};
            connection.write(dataPackage);
            assert.deepEqual(connection.lastWroteData, dataPackage);
        });

        it('Connection state is "connected"', () => {
            assert.ok(connection.isConnected);
        });

        it("Close connection", () => {
            connection.close();
            assert.ok(!connection.isConnected);
        });

    });

});
