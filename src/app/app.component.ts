import {Observable} from "rxjs/Rx";
import {Component} from "@angular/core";

import {
  ConnectionStates,
  TickerService,
  Ticker
} from "./services/ticker.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent {
  tickers: Ticker[] = [];
  connectionStatus$: Observable<string>;
  title = "app";

  constructor(private _tickerService: TickerService) {
    const stateLookup = new Map([
      [ConnectionStates.CONNECTING, "WAITING FOR CONNECTION"],
      [ConnectionStates.CONNECTED, "CONNECTED"],
      [ConnectionStates.CLOSED, "CLOSED"],
      [ConnectionStates.RETRYING, "RETRYING"]
    ]);

    this.connectionStatus$ = this._tickerService.connectionState$.map(state =>
      stateLookup.get(state)
    );
  }

  onSelect({symbol}) {
    const tickers = this.tickers;
    if (tickers.find(x => x.symbol === symbol)) {
      return;
    }

    const ticks = this._tickerService.getTicker(symbol);
    tickers.push(new Ticker(symbol, ticks));
  }

  removeTicker(symbol: string) {
    const tickers = this.tickers;
    const index = tickers.findIndex(x => x.symbol === symbol);
    if (index !== -1) {
      tickers.splice(index, 1);
    }
  }
}
