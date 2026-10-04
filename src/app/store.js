/* ==========================================================================
   DRAGME APP STATE STORE: (src/app/store.js)
   Centralized reactive store with event pub/sub for cross-feature syncing
   ========================================================================== */

import { SEED_POSTS } from '../constants/seedPosts.js';

class AppStore {
  constructor() {
    this.state = {
      currentUser: null,
      currentRoom: 'all',
      currentSort: 'hot',
      searchQuery: '',
      posts: [...SEED_POSTS],
      activePostId: null,
      activeComments: [],
      modals: {
        createPost: false,
        commentsSheet: false,
        whoReacted: false,
        authPrompt: false,
        login: false,
        signup: false,
        logoutConfirm: false,
        mediaStudio: false,
        profileDrawer: false
      }
    };
    this.listeners = new Map();
  }

  getState() {
    return this.state;
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }

  notify(key, value) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(cb => {
        try { cb(value, this.state); } catch (e) { console.error(`Error in listener for ${key}:`, e); }
      });
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => {
        try { cb(key, value, this.state); } catch (e) {}
      });
    }
  }

  setUser(user) {
    this.state.currentUser = user;
    this.notify('user', user);
  }

  setRoom(room) {
    this.state.currentRoom = room;
    this.notify('room', room);
  }

  setSort(sort) {
    this.state.currentSort = sort;
    this.notify('sort', sort);
  }

  setSearchQuery(query) {
    this.state.searchQuery = query;
    this.notify('search', query);
  }

  setPosts(posts) {
    this.state.posts = posts;
    this.notify('posts', posts);
  }

  addPost(post) {
    this.state.posts.unshift(post);
    this.notify('posts', this.state.posts);
    this.notify('post:created', post);
  }

  updatePost(postId, updates) {
    const idx = this.state.posts.findIndex(p => p.id === postId);
    if (idx !== -1) {
      this.state.posts[idx] = { ...this.state.posts[idx], ...updates };
      this.notify('posts', this.state.posts);
      this.notify(`post:${postId}`, this.state.posts[idx]);
    }
  }

  setModal(name, isOpen) {
    if (this.state.modals[name] !== undefined) {
      this.state.modals[name] = Boolean(isOpen);
      this.notify(`modal:${name}`, Boolean(isOpen));
      this.notify('modals', this.state.modals);
    }
  }
}

export const store = new AppStore();
export default store;
