/**
 * Developer: Alex Voronyansky <belirafon@gmail.com>
 * Date: 26.04.2016
 * Time: 13:47
 */

import connector from "../lib/index";

connector().connect("login", "password", {host: "127.0.0.1", port: 5038})
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
