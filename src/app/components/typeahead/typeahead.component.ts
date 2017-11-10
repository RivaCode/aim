import {
  Component,
  EventEmitter,
  Output,
  AfterContentInit,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy
} from "@angular/core";
import {Subject, Observable} from "rxjs/Rx";

import {TickerloaderService, IStock} from "../../services/tickerloader.service";

@Component({
  selector: "typeahead",
  templateUrl: "./typeahead.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ["./typeahead.component.css"]
})
export class TypeaheadComponent implements AfterContentInit {
  private _clear = new Subject<void>();

  @Output() selected = new EventEmitter<IStock>();
  @ViewChild("symbolTxt") symbolTxt: ElementRef;

  tickers: Observable<IStock[]>;

  constructor(private _tickerLoader: TickerloaderService) {}

  ngAfterContentInit(): void {
    this.tickers = Observable.fromEvent(this.symbolTxt.nativeElement, "input")
      .map(_ => <string>this.symbolTxt.nativeElement.value)
      .debounceTime(200)
      .distinctUntilChanged()
      .switchMap((val: string) => this._tickerLoader.load(val))
      .merge(this._clear.mapTo([]));
  }

  onSelect(ticker: IStock) {
    this.selected.next(ticker);
    this._clear.next();
    this.symbolTxt.nativeElement.value = "";
  }
}
