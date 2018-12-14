import Vue from 'vue'
import Vuex from 'vuex'
import VuexPersistence from 'vuex-persist'
import { loginUser } from './chatkit'
import moment from 'moment';

Vue.use(Vuex)

const vuexLocal = new VuexPersistence({
  storage: window.localStorage
})

export default new Vuex.Store({
  state: {
    loading: false,
    error: '',
    hasError: false,
    reconnect: false,
    currentUser: null,
    activeRoom: null,
    users: [],
    messages: []
  },
  mutations: {
    setCurrentUser(state, currentUser) {
      state.currentUser = currentUser;
    },
    setReconnect(state, reconnect) {
      state.reconnect = reconnect;
    },
    setActiveRoom(state, roomId) {
      state.activeRoom = roomId;
    },
    setUsers(state, users) {
      state.users = users
    },
    clearChat(state) {
      state.users = [];
      state.messages = [];
    },
    setMessages(state, messages) {
      state.messages = messages
    },
    addMessage(state, message) {
      state.messages.push(message)
    }
  },
  actions: {
    login: async({ commit, state }, userId) => {
      try {
        console.info("Please wait..... authenticating",userId)
        state.hasError = false;
        state.error = '';
        state.loading = true;
        commit('clearChat');
        const currentUser = await loginUser(userId);
        console.info("Authentication Successful!")
        commit('setCurrentUser', currentUser);
        commit('setReconnect', false);
        const activeRoom = currentUser.rooms[0];
        commit('setActiveRoom', activeRoom);
        await currentUser.subscribeToRoom({
          roomId: activeRoom.id,
          hooks: {
            onMessage: message => {
              commit('addMessage', {
                name: message.sender.name,
                username: message.senderId,
                text: message.text,
                date: moment(message.createdAt).format('h:mm:ss a D-MM-YYYY')
              });
            },
            onPresenceChanged: () => {
              commit('setUsers', state.activeRoom.users);
            }
          }
        });
        return true
      } catch (error) {
        console.log(error)
        state.hasError = true;
        state.error = error.message || error.info.error_description;
      } finally {
        state.loading = false;
      }
    },
    sendMessage: async({ state }, message) => {
      const result = await state.currentUser.sendMessage({
        text: message,
        roomId: state.activeRoom.id
      });
      return result;
    },
    changeRoom: ({ commit }, roomId) => {
      // TODO
    },
    logout: async ({ commit, state }) => {
      await state.currentUser.disconnect();
      commit('setCurrentUser', null);
      commit('clearChat');
      commit('setActiveRoom', null);
    }
  },
  getters: {
    username: state => state.currentUser ? state.currentUser.id : '',
    name: state => state.currentUser ? state.currentUser.name : '',
    rooms: state => state.currentUser ? state.currentUser.rooms : [],
  },
  plugins: [vuexLocal.plugin]
})