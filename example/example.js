import {createElement} from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
const div = document.createElement('div');
document.body.append(div);
ReactDOM.createRoot(div).render(createElement(
  React.StrictMode,
  null,
  createElement(
    "div",
    null,
    "Hai!",
  ),
));
