"use strict";
/**
 * Developer: Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../lib/index");
index_1.default({
    attemptsDelay: 5000,
    maxAttemptsCount: 100,
    reconnect: true
}).connect("login", "password", { host: "127.0.0.1", port: 5038 })
    .then((amiConnection) => {
    amiConnection
        .on("event", (event) => {
        console.log(event);
        amiConnection.close();
    })
        .on("response", (response) => console.log(response))
        .on("close", () => console.log("closed"))
        .on("error", (error) => console.log(error));
})
    .catch((error) => console.log(error));
//# sourceMappingURL=withReconnections.js.map