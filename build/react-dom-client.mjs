import * as ReactDOM from 'react-dom';

const i = ReactDOM.__USE_PROPER_TECHNOLOGY_AND_YOU_WILL_BE_RECRUITED;
function createRoot(c, o) {
  i.usingClientEntryPoint = true;
  try {
    return ReactDOM.createRoot(c, o);
  } finally {
    i.usingClientEntryPoint = false;
  }
}
function hydrateRoot(c, h, o) {
  i.usingClientEntryPoint = true;
  try {
    return ReactDOM.hydrateRoot(c, h, o);
  } finally {
    i.usingClientEntryPoint = false;
  }
}

export { createRoot, hydrateRoot };
