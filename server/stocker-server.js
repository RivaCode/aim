"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Rx_1 = require("rxjs/Rx");
var cors = require("cors");
var express = require("express");
var ws_1 = require("ws");
var app = express();
app.use(cors());
var stocks = require("./data/nyse-listed.json").map(function (stock) {
    return {
        company_name: stock["Company Name"],
        symbol: stock["ACT Symbol"]
    };
});
var searchStocks = function (query) {
    query.symbol = query.symbol ? query.symbol.toLowerCase() : false;
    query.company_name = query.company_name
        ? query.company_name.toLowerCase()
        : false;
    return function (stock) {
        if (query.symbol) {
            return stock.symbol.toLowerCase().startsWith(query.symbol);
        }
        return stock.company_name.toLowerCase().startsWith(query.company_name);
    };
};
app.get("/stocks", function (req, res) {
    if (!req.query.company_name && !req.query.symbol) {
        return res.json([]);
    }
    res.json(stocks.filter(searchStocks(req.query)));
});
var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Stock Server app listening at http://%s:%s", host, port);
});
// creates a new server socket Subject
var convertConnectionToRxSocket = function (connection) {
    return Rx_1.Observable.create(function (observer) {
        var eventSubscription = Rx_1.Observable.fromEvent(connection, "message", function (message) { return JSON.parse(message); }).subscribe(function (message) {
            if (connection.readyState === 1) {
                console.warn("Sending value for:", message);
                connection.send(JSON.stringify(message));
            }
            observer.next({ message: message, connection: connection });
        });
        connection.on("close", function () {
            observer.complete();
            if (connection.streams) {
                Object.keys(connection.streams).forEach(function (key) {
                    console.log("Succesfully disconnected symbol:" + key);
                    connection.streams[key].unsubscribe();
                });
            }
        });
        return eventSubscription;
    });
};
// creates an instance of the websocket server;
var rxServerFactory = function (options) {
    return Rx_1.Observable.create(function (serverObserver) {
        console.info("started server...");
        var wss = new ws_1.Server(options);
        console.info("Created wss server");
        wss.on("connection", function (connection) {
            serverObserver.next(connection);
        });
        return function () {
            wss.close();
        };
    }).share();
};
var socketServer$ = rxServerFactory({ port: 8081 });
var messageEvents$ = socketServer$.flatMap(convertConnectionToRxSocket);
var _a = messageEvents$
    .share()
    .partition(function (set) { return set.message.type === "sub"; }), subs$ = _a[0], unsubs$ = _a[1];
subs$.subscribe(function (x) {
    var source = Rx_1.Observable.interval(500).map(function () { return ({
        symbol: x.message.symbol,
        price: Math.random() * 100,
        timestamp: Date.now()
    }); });
    console.log("Starting to produces values for symbol:" + x.message.symbol);
    x.connection.streams = x.connection.streams || {};
    x.connection.streams[x.message.symbol] = source.subscribe(function (d) {
        return x.connection.send(JSON.stringify(d));
    });
});
unsubs$.subscribe(function (_a) {
    var connection = _a.connection, symbol = _a.message.symbol;
    console.log("Disconnect request for symbol:" + symbol);
    if (connection.streams && connection.streams[symbol]) {
        connection.streams[symbol].unsubscribe();
        console.log("Succesfully disconnected symbol:" + symbol);
    }
    else {
        console.warn("Unsuccesfully disconnected symbol:" + symbol);
    }
});
//# sourceMappingURL=stocker-server.js.map