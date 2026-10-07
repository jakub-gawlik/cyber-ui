<script setup>
import { ref, computed } from 'vue';
import { toast } from '@jgawlik/cyber-ui';

const events = ref([
  {
    id: 1,
    title: 'Signal Lost',
    text: 'Long-range sensors report an anomaly in the Kerbol system.',
  },
  {
    id: 2,
    title: 'First Contact',
    text: 'An unidentified fleet has entered the outer rim.',
  },
]);

const modalOpen = ref(false);
const closeCount = ref(0);
const callsign = ref('ISS Aurora');
const hull = ref(72);
const hullStyle = computed(() => `--cyber-progress: ${hull.value}%`);

function onModalClose() {
  modalOpen.value = false;
  closeCount.value++;
}

function notify(event) {
  toast(event.text, { title: event.title, variant: 'warning' });
}
</script>

<template>
  <main style="padding: 2rem; max-width: 60rem">
    <h1 class="cyber-heading">cyber-ui × Vue 3</h1>
    <p class="cyber-terminal">// v-for + slots + events + v-model + toast()</p>

    <!-- v-model on a styled NATIVE input -->
    <div class="cyber-field" style="max-width: 20rem; margin-top: 1rem">
      <label for="callsign">Callsign (v-model)</label>
      <input id="callsign" class="cyber-input" v-model="callsign" />
    </div>
    <p class="cyber-text cyber-text--dim">
      Bound value: <span class="cyber-terminal" data-test="callsign">{{ callsign }}</span>
    </p>

    <!-- reactive style binding driving a progress bar -->
    <div class="cyber-progress" :style="hullStyle" style="max-width: 20rem">
      <div class="cyber-progress__label"><span>Hull</span><span>{{ hull }}%</span></div>
      <div class="cyber-progress__track" role="progressbar" :aria-valuenow="hull">
        <div class="cyber-progress__bar"></div>
      </div>
    </div>
    <button class="cyber-btn cyber-btn--sm" style="margin-top: 0.5rem" @click="hull = Math.max(hull - 10, 0)">
      Take damage
    </button>

    <!-- web components in v-for with named slots -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-top: 2rem">
      <cyber-card v-for="event in events" :key="event.id">
        <span slot="title">{{ event.title }}</span>
        <p style="margin: 0">{{ event.text }}</p>
        <a slot="footer" href="#" @click.prevent="notify(event)">Notify</a>
        <a slot="footer" href="#" @click.prevent="modalOpen = true">Open modal</a>
      </cyber-card>
    </div>

    <!-- custom element boolean prop + custom event via @cyber-close -->
    <cyber-modal :open="modalOpen" @cyber-close="onModalClose">
      <span slot="title">Vue Interop</span>
      <p style="margin: 0">
        This modal's <code>open</code> prop is Vue state; closing it fires
        <code>cyber-close</code>, caught with <code>@cyber-close</code>.
      </p>
      <button slot="footer" class="cyber-btn cyber-btn--primary" @click="modalOpen = false">
        Acknowledge
      </button>
    </cyber-modal>
    <p class="cyber-text cyber-text--dim">
      cyber-close events received:
      <span class="cyber-terminal" data-test="close-count">{{ closeCount }}</span>
    </p>
  </main>
</template>
