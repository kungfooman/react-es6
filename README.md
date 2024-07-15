# What is this?

This repository ships these ESM-consumable files, which can be used without needing any annoying build-tool:

    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^5.2.0",

# Installation

`npm i react-es6@1.0.2`

# Example script

**example.js**

```js
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
```

Then just a `importmap.js` and a HTML file including this script and you are ready to use React without stones in your way.

Full example: [./example/](https://github.com/kungfooman/react-es6/tree/master/example)

# 65wat

The only reason this repository exists is because React doesn't ship them... what are they paid for?!
