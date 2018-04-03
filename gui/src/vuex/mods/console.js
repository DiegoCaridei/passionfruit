import * as types from '~/vuex/types'

const LIMIT = 100

export const state = {
  list: [],
  unread: 0,
  active: false,
  logging: true,
}

export const mutations = {
  [types.CONSOLE_RUNNING](state, on) {
    state.logging = on
  },
  [types.CONSOLE_APPEND](state, items) {
    if (!state.logging)
      return

    const overflow = state.list.length + items.length - LIMIT
    state.list.splice(state.list.length - overflow, overflow)
    state.list.unshift(...items)

    if (!state.active)
      state.unread += items.length
  },
  [types.CONSOLE_ACTIVE](state, active) {
    state.active = active
    if (active) {
      state.unread = 0
    }
  },
  [types.CONSOLE_CLEAR](state) {
    state.unread = 0
    state.list = []
  },
}

export const getters = {
  [types.CONSOLE_LIST]: state => state.list,
  [types.CONSOLE_UNREAD]: state => state.unread,
  [types.CONSOLE_RUNNING]: state => state.loggine,
}