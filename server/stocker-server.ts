import {Observable, Subject} from "rxjs/Rx";
import * as cors from "cors";
import * as express from "express";
import {Server} from "ws";

const app = express();
app.use(cors());

const stocks = require("./data/nyse-listed.json").map(stock => {
  return {
    company_name: stock["Company Name"],
    symbol: stock["ACT Symbol"]
  };
});

const searchStocks = query => {
  query.symbol = query.symbol ? query.symbol.toLowerCase() : false;
  query.company_name = query.company_name
    ? query.company_name.toLowerCase()
    : false;

  return stock => {
    if (query.symbol) {
      return stock.symbol.toLowerCase().startsWith(query.symbol);
    }
    return stock.company_name.toLowerCase().startsWith(query.company_name);
  };
};

app.get("/stocks", function(req, res) {
  if (!req.query.company_name && !req.query.symbol) {
    return res.json([]);
  }
  res.json(stocks.filter(searchStocks(req.query)));
});

const server = app.listen(3000, function() {
  const host = server.address().address;
  const port = server.address().port;

  console.log("Stock Server app listening at http://%s:%s", host, port);
});

// creates a new server socket Subject
const convertConnectionToRxSocket = connection => {
  return Observable.create(observer => {
    const eventSubscription = Observable.fromEvent(
      connection,
      "message",
      message => JSON.parse(message)
    ).subscribe(message => {
      if (connection.readyState === 1) {
        console.warn("Sending value for:", message);
        connection.send(JSON.stringify(message));
      }
      observer.next({message, connection});
    });

    connection.on("close", () => {
      observer.complete();
      if (connection.streams) {
        Object.keys(connection.streams).forEach(key => {
          console.log(`Succesfully disconnected symbol:${key}`);
          connection.streams[key].unsubscribe();
        });
      }
    });

    return eventSubscription;
  });
};

// creates an instance of the websocket server;
const rxServerFactory = options => {
  return Observable.create(serverObserver => {
    console.info("started server...");
    const wss = new Server(options);
    console.info("Created wss server");
    wss.on("connection", connection => {
      serverObserver.next(connection);
    });
    return () => {
      wss.close();
    };
  }).share();
};

const socketServer$ = rxServerFactory({port: 8081});
const messageEvents$ = socketServer$.flatMap(convertConnectionToRxSocket);

const [subs$, unsubs$] = messageEvents$
  .share()
  .partition(set => set.message.type === "sub");

subs$.subscribe((x: {connection; message}) => {
  const source = Observable.interval(500).map(() => ({
    symbol: x.message.symbol,
    price: Math.random() * 100,
    timestamp: Date.now()
  }));
  console.log(`Starting to produces values for symbol:${x.message.symbol}`);
  x.connection.streams = x.connection.streams || {};
  x.connection.streams[x.message.symbol] = source.subscribe(d =>
    x.connection.send(JSON.stringify(d))
  );
});

unsubs$.subscribe(({connection, message: {symbol}}: any) => {
  console.log(`Disconnect request for symbol:${symbol}`);
  if (connection.streams && connection.streams[symbol]) {
    connection.streams[symbol].unsubscribe();
    console.log(`Succesfully disconnected symbol:${symbol}`);
  } else {
    console.warn(`Unsuccesfully disconnected symbol:${symbol}`);
  }
});
