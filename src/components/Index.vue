<template>
  <Layout>
    <h1 class="display-4">List of Stanzas</h1>

    <div v-if="allMetadata.length > 0" class="list-group mt-3">
      <a v-for="metadata in allMetadata" :key="metadata['@id']" :href="`./${metadata['@id']}.html`" class="list-group-item list-group-item-action py-3">
        <div>{{metadata['stanza:label']}}</div>
        <p v-if="metadata['stanza:definition']" class="small text-muted text-truncate mt-1 mb-0">{{metadata['stanza:definition']}}</p>
      </a>
    </div>

    <p v-else>No stanzas defined.</p>
  </Layout>
</template>

<script>
import { defineComponent } from 'vue';

import Layout from './Layout.vue';

export default defineComponent({
  components: {
    Layout
  },

  props: ['allMetadata'],

  setup(props) {
    return props;
  }
});
</script>
