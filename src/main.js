import './styles/style.scss'
import 'maplibre-gl/dist/maplibre-gl.css'
import App from './App.svelte'
import { mount as mountComponent } from 'svelte'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

const applyHostMetadata = (host) => {
  if (!host || !APP_VERSION) {
    return
  }

  host.setAttribute('data-version', APP_VERSION)
}

const getMountTarget = () => {
  const host = document.getElementById('iran-war-chronology')

  if (!host) {
    return null
  }

  applyHostMetadata(host)
  return host
}

let app

const mountApp = () => {
  const mountTarget = getMountTarget()

  if (!mountTarget) {
    return
  }

  app = mountComponent(App, { target: mountTarget })
}

(() => {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', mountApp, { once: true })
  } else {
    mountApp()
  }
})()

export default app
