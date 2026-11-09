import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createWebHistory } from 'vue-router'
import { config as fontAwesomeConfig } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import '@/styles/main.scss'
import App from './App.vue'
import { i18n } from '@/i18n'
import { createAppRouter } from '@/router'

// Font Awesome's CSS is imported above with the other styles, so it must not inject it again at
// runtime (that would also need an inline <style>, which a strict Content Security Policy blocks).
fontAwesomeConfig.autoAddCss = false

createApp(App)
  .use(createPinia())
  .use(i18n)
  .use(createAppRouter(createWebHistory(import.meta.env.BASE_URL)))
  .mount('#app')
