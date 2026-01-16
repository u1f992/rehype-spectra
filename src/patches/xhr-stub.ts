declare const window: { XMLHttpRequest: unknown };
declare const __xhrReadFileSync: (url: string) => string;

class XHRStub {
  readyState = 0;
  status = 0;
  statusText = "";
  responseText = "";
  onreadystatechange: (() => void) | null = null;
  private _url = "";

  open(_method: string, url: string) {
    this._url = url;
  }

  send() {
    try {
      this.responseText = __xhrReadFileSync(this._url);
      this.status = 200;
      this.statusText = "OK";
    } catch {
      this.status = 404;
      this.statusText = "Not Found";
      this.responseText = "";
    }
    this.readyState = 4;
    if (this.onreadystatechange) {
      this.onreadystatechange();
    }
  }
}

window.XMLHttpRequest = XHRStub;
