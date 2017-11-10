import {Injectable, Inject} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs/Rx";

import {RxWebSocket} from "./rx-websocket";
import {SOCKET_URL} from "../config";

@Injectable()
export class TickerService {
  private url: string;
  private _socket: RxWebSocket;
  private connectionState = new BehaviorSubject<ConnectionStates>(
    ConnectionStates.CONNECTING
  );

  // connection state is a behavior subject, so anyone that
  // subscribes to it can see the most recent value it's emitted.
  connectionState$ = this.connectionState.asObservable();

  constructor(@Inject(SOCKET_URL) private _url: string) {
    this._socket = RxWebSocket.create(this._url, WebSocket);
    this.setupSocketStates();
  }

  getTicker(symbol: string): Observable<TickerMessage> {
    const socket = this._socket;

    // create a custom observable to return by wrapping
    // our subscription to the socket.
    return (
      Observable.create(subscriber => {
        // when we subscribe to this observable...

        // first subscribe to the socket, filtering out only the
        // messages we care about
        const msgSub = socket.out
          .filter<TickerMessage>(
            d => d.symbol === symbol && d.price !== undefined
          )
          .subscribe(subscriber);

        // now send a message over the socket to tell the server
        // we want to subscribe to a particular stream of data
        socket.in.next({symbol, type: "sub"});

        // return an unsubscription function that, when you unsubscribe...
        return () => {
          // ... sends a message to the server to tell it to stop sending
          // our data for this observable.
          socket.in.next({symbol, type: "unsub"});
          // ... and then unsubscribe from the socket
          // FUN: if this is the last thing subscribed to the socket, the socket will close!
          msgSub.unsubscribe();
        };
      })
        // now share it to make it "hot"
        // ... that way we don't create the data producer for this more than once.
        .share()
        // if this fails, let's retry. The retryWhen operator
        // gives us a stream of errors that we can transform
        // into an observable that notifies when we should retry the source
        .retryWhen(errors$ =>
          errors$.switchMap(_ => {
            // update the connection state to let it know we're retrying
            this.connectionState.next(ConnectionStates.RETRYING);

            if (navigator.onLine) {
              // if we have a network connection, try again in 3 seconds
              return Observable.timer(3000);
            } else {
              // if we're offline, so wait for an online event.
              return Observable.fromEvent(window, "online").take(1);
            }
          })
        )
    );
  }

  private setupSocketStates(): void {
    const {connectionState, _socket} = this;

    // subscribe to events from our RxWebSocket to update connection status
    _socket.didOpen = () => connectionState.next(ConnectionStates.CONNECTED);

    _socket.willOpen = () => connectionState.next(ConnectionStates.CONNECTING);

    _socket.didClose = () => connectionState.next(ConnectionStates.CLOSED);
  }
}

export enum ConnectionStates {
  CONNECTING,
  CONNECTED,
  CLOSED,
  RETRYING
}

export interface TickerMessage {
  symbol: string;
  price: number;
  timestamp: number;
}

export class Ticker {
  recentTicks: Observable<TickerMessage[]>;

  maxRecentTicks = 41;

  constructor(public symbol: string, public ticks: Observable<TickerMessage>) {
    // take each tick we're getting and scan it into an
    // observable of arrays, where each array is a list of
    // accumulated values
    this.recentTicks = this.ticks.scan((acc, tick) => {
      const result = acc.concat([tick]);
      while (result.length > this.maxRecentTicks) {
        result.shift();
      }
      return result;
    }, []);
  }
}
