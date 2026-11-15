import { NoticeStore } from './notice-store';

const notice = (id: string, title = id) => ({ id, level: 'warning' as const, title });

describe('NoticeStore', () => {
  it('when notices were added, should hand them over in order and empty the buffer', () => {
    const store = new NoticeStore();

    store.add(notice('a'));
    store.add(notice('b'));

    expect(store.drain()).toEqual([notice('a'), notice('b')]);
    expect(store.drain()).toEqual([]);
  });

  it('when a notice with the same id is added again, should replace the old one instead of duplicating', () => {
    const store = new NoticeStore();

    store.add(notice('a', 'velho'));
    store.add(notice('b'));
    store.add(notice('a', 'novo'));

    expect(store.drain()).toEqual([notice('b'), notice('a', 'novo')]);
  });

  it('when nothing was added, should hand over an empty list', () => {
    expect(new NoticeStore().drain()).toEqual([]);
  });
});
