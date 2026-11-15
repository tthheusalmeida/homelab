import { IpcChannels } from '../shared/channels';

import { IpcHandler, type IpcRoute } from './ipc-handler';

class TestHandler extends IpcHandler {
  routes(): IpcRoute[] {
    return [this.route(IpcChannels.app.version, () => '1.2.3')];
  }
}

describe('IpcHandler', () => {
  it('when declaring a route, should expose its channel and a runner returning the raw data', async () => {
    const [route] = new TestHandler().routes();

    expect(route.channel).toBe(IpcChannels.app.version);
    await expect(Promise.resolve(route.run(undefined))).resolves.toBe('1.2.3');
  });
});
