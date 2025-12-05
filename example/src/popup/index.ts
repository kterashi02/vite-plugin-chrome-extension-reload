import { setupCounter } from './counter.ts'
import './style.css'

document.querySelector('#app')!.innerHTML = `
  <div>
    <h1>Sample Extension Popup </h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`

setupCounter(document.querySelector('#counter')!)
