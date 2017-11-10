import {Injectable} from "@angular/core";
import {Http, Response} from "@angular/http";
import {Observable} from "rxjs/Rx";

@Injectable()
export class TickerloaderService {
  constructor(private _http: Http) {}

  load(val: string): Observable<IStock[]> {
    return this._http
      .get(`http://localhost:3000/stocks?symbol=${val}`)
      .retry(2)
      .map((res: Response) => <IStock[]>res.json());
  }
}

export interface IStock {
  symbol: string;
  company_name: string;
}
