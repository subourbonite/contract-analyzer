import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { Authenticator } from '@aws-amplify/ui-react'
import App from './App.tsx'
import amplifyconfig from './amplifyconfiguration.json'
import './index.css'
import '@aws-amplify/ui-react/styles.css'

Amplify.configure(amplifyconfig)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Authenticator>
      <App />
    </Authenticator>
  </React.StrictMode>,
)
