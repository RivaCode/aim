import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";
import {HttpModule} from "@angular/http";

import {SOCKET_URL} from "./config";
import {AppComponent} from "./app.component";

import {RxWebSocket} from "./services/rx-websocket";
import {TickerloaderService} from "./services/tickerloader.service";
import {TickerService} from "./services/ticker.service";
import {TypeaheadComponent} from "./components/typeahead/typeahead.component";
import {NavbarComponent} from "./components/navbar/navbar.component";
import {StockGraphComponent} from "./components/graph/graph.component";

const COMPONENTS = [AppComponent, TypeaheadComponent, NavbarComponent, StockGraphComponent];

@NgModule({
  declarations: COMPONENTS,
  exports: COMPONENTS,
  imports: [BrowserModule, HttpModule],
  providers: [
    TickerloaderService,
    TickerService,
    {
      provide: SOCKET_URL,
      useValue: SOCKET_URL
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
