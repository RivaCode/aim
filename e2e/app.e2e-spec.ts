import { StacksharePage } from './app.po';

describe('stackshare App', () => {
  let page: StacksharePage;

  beforeEach(() => {
    page = new StacksharePage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!');
  });
});
