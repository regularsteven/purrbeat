export function createFocusCarousel(keys, initialKey = null) {
  const order = Array.isArray(keys) ? keys.filter(Boolean) : [];
  if (!order.length) {
    return {
      current: null,
      next: () => null,
      prev: () => null,
      setByKey: () => null,
      getIndex: () => -1,
      getKeys: () => [],
    };
  }

  let index = initialKey ? Math.max(0, order.indexOf(initialKey)) : 0;
  if (index === -1) index = 0;

  const api = {
    get current() {
      return order[index];
    },
    next() {
      index = (index + 1) % order.length;
      return api.current;
    },
    prev() {
      index = (index - 1 + order.length) % order.length;
      return api.current;
    },
    setByKey(key) {
      const nextIndex = order.indexOf(key);
      if (nextIndex === -1) return api.current;
      index = nextIndex;
      return api.current;
    },
    getIndex() {
      return index;
    },
    getKeys() {
      return [...order];
    },
  };

  return api;
}
