import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import thunk  from 'redux-thunk';
import authReducer from './reducers/authReducer';
import chatReducer from './reducers/chatReducer';
import messageReducer from './reducers/messageReducer';
import uiReducer from './reducers/uiReducer';
import callReducer from './reducers/callReducer';
import notificationReducer from './reducers/notificationReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  messages: messageReducer,
  ui: uiReducer,
  calls: callReducer,
  notifications: notificationReducer
});

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);

export default store;
