import Vue from 'vue'
import VueRouter from 'vue-router'

import WelcomeView from './Welcome.vue'
import DeviceView from './Device.vue'
import InspectView from './Inspect.vue'

Vue.use(VueRouter)

const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/welcome',
      component: WelcomeView,
      meta: { title: 'Select an App to inspect' },
      name: 'welcome',
      children: [{
        path: 'apps/:device', component: DeviceView, name: 'apps'
      }]
    },
    { path: '/app/:device/:bundle', component: InspectView },
    { path: '/', redirect: '/welcome' }
  ]
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'ipaspect'
  next()
})

export default router