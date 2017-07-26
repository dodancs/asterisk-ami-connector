import AmiConnection from "./AmiConnection";

export interface IAmiConnectionOptions {
    port: number;
    host?: string;
    localAddress?: string;
    localPort?: number;
    family?: number;
    allowHalfOpen?: boolean;
}

export type TAmiConnection = (login: string, secret: string, connectionOptions: IAmiConnectionOptions) => Promise<AmiConnection>;
export type TAmiConnector = (options: IAmiConnectorOptions) => IAmiConnectorReturn ;

export interface IAmiConnectorReturn {
    connect: TAmiConnection;
}

export interface IAmiConnectorOptions {
    reconnect?: boolean;
    maxAttemptsCount?: null | number;
    attemptsDelay?: number;
}
