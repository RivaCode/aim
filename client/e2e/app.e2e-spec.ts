import { StocksharePage } from './app.po';

describe('stockshare App', () => {
  let page: StocksharePage;

  beforeEach(() => {
    page = new StocksharePage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
