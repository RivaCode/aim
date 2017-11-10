import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs/Rx";

@Injectable()
export class TickerloaderService {
  constructor(private _http: HttpClient) {}

  load(val: string): Observable<IStock[]> {
    return this._http
      .get<IStock[]>(`http://localhost:3000/stocks?symbol=${val}`)
      .retry(2);
  }
}

export interface IStock {
  symbol: string;
  company_name: string;
}
