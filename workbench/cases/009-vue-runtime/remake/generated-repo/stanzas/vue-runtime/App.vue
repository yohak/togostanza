<template>
  <section data-probe="vue-runtime">
    <h1>Vue runtime probe</h1>
    <p data-probe="label">{{ label }}</p>
  </section>
</template>

<script>
export default {
  props: {
    label: {
      type: String,
      required: true
    }
  }
};
</script>
