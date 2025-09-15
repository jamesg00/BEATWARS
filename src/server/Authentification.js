import {createRoot} from 'react-dom/client';
import {Auth0Provider} from '@auth0/auth0-react';



import Login from './Login.js';



const root = createRoot(document.getElementById('root'));

root.render(
<Auth0Provider
    domain="dev-mp31kugugjkdsqe3.us.auth0.com"
    clientId="nq9TiwHheoEvz5wzBVA3vVFgMGbRLuCD"
    authorizationParams={{
      redirect_uri: window.location.origin
    }}
  >
    <Login />
  </Auth0Provider>,
);