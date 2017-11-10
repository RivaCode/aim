import {Subject, Observable, Subscriber, Subscription, Observer} from "rxjs/Rx";

import {connect} from "socket.io-client";

export class RxWebSocket {
  private _out: Observable<any>;
  private _in: Observer<any>;
  private _socket: SocketIOClient.Socket;
  private _messageQueue: {}[] = [];

  didOpen: () => void;
  willOpen: () => void;
  didClose: () => void;

  static create(url: string): RxWebSocket {
    return new RxWebSocket(url);
  }

  get out(): Observable<any> {
    if (!this._out) {
      this._out = Observable.create(subscriber => {
        if (this.willOpen) {
          this.willOpen();
        }

        const socketIO = (this._socket = connect(this._url));
        socketIO.on("connect", () => {
          this.flushMessages();
          if (this.didOpen) {
            this.didOpen();
          }
        });

        socketIO.on("disconnect", reason => {
          if (reason !== "io server disconnect") {
            subscriber.complete();
            if (this.didClose) {
              this.didClose();
            }
          } else {
            subscriber.error({error: reason});
          }
        });

        socketIO.on("error", e => subscriber.error(e));

        socketIO.on("message", msg => subscriber.next(msg));

        return () => {
          socketIO.close();
          this._socket = null;
          this._out = null;
        };
      }).share();
    }

    return this._out;
  }

  get in(): Observer<{}> {
    if (!this._in) {
      this._in = {
        closed: !this._socket || this._socket.disconnected,
        next: (message: {}) => {
          if (this._socket && this._socket.connected) {
            this._socket.send(message);
          } else {
            this._messageQueue.push(message);
          }
        },
        error: (err: any) => {
          this._socket.close();
          this._socket = null;
        },
        complete: () => {
          this._socket.close();
          this._socket = null;
        }
      };
    }
    return this._in;
  }

  private constructor(private _url: string) {}

  private flushMessages() {
    const {_messageQueue, _socket} = this;

    while (_messageQueue.length > 0 && _socket.connected) {
      _socket.send(_messageQueue.shift());
    }
  }
}
