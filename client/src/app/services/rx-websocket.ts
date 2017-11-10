import {Subject, Observable, Subscriber, Subscription, Observer} from "rxjs/Rx";

export class RxWebSocket {
  private _out: Observable<any>;
  private _in: Observer<any>;

  private _socket: WebSocket;
  private _messageQueue: string[] = [];
  didOpen: (e: Event) => void;
  willOpen: () => void;
  didClose: (e?: any) => void;

  static create(
    url: string,
    WebSocketCtor: {new (url: string): WebSocket} = WebSocket
  ): RxWebSocket {
    return new RxWebSocket(url, WebSocketCtor);
  }

  get out(): Observable<any> {
    if (!this._out) {
      this._out = Observable.create((subscriber: Observer<any>) => {
        if (this.willOpen) {
          this.willOpen();
        }

        const socket = (this._socket = new this.WebSocketCtor(this.url));

        socket.onopen = e => {
          this.flushMessages();
          if (this.didOpen) {
            this.didOpen(e);
          }
        };

        socket.onclose = e => {
          if (e.wasClean) {
            subscriber.complete();
            if (this.didClose) {
              this.didClose(e);
            }
          } else {
            subscriber.error(e);
          }
        };

        socket.onerror = e => subscriber.error(e);

        socket.onmessage = e => {
          subscriber.next(this.selector(e));
        };

        return () => {
          socket.close();
          this._socket = null;
          this._out = null;
        };
      }).share();
    }

    return this._out;
  }

  private constructor(
    private url: string,
    private WebSocketCtor: {new (url: string): WebSocket} = WebSocket
  ) {}

  send(message: any) {
    const data =
      typeof message === "string" ? message : JSON.stringify(message);
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      this._socket.send(data);
    } else {
      this._messageQueue.push(data);
    }
  }

  private selector(e: MessageEvent) {
    return JSON.parse(e.data);
  }

  private flushMessages() {
    const {_messageQueue, _socket} = this;

    while (_messageQueue.length > 0 && _socket.readyState === WebSocket.OPEN) {
      _socket.send(_messageQueue.shift());
    }
  }
}
