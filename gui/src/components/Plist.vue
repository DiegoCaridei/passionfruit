<template>
  <div class="plist-viewer">
    <h3 class="title" v-if="title">{{ title }}</h3>
    <b-field class="column">
      <p class="control">
        <a class="button" @click="expandAll">
          <b-icon icon="add"></b-icon>
          <span>Expand All</span>
        </a>
      </p>
      <p class="control">
        <a class="button" @click="closeAll">
          <b-icon icon="remove"></b-icon>
          <span>Collapse All</span>
        </a>
      </p>
      <b-input icon="search" v-model="filter" type="search" placeholder="Search keys and values..." expanded></b-input>
    </b-field>

    <ul class="is-marginless">
      <plist-tree-view :model="tree" :open="true" class="info-plist" ref="tree"></plist-tree-view>
    </ul>
  </div>
</template>

<script>
import { debounce } from '~/lib/utils'
import PlistTreeView from '~/components/PlistTreeView.vue'

export default {
  components: { PlistTreeView },
  props: {
    content: Object,
    title: String,
    rootName: String,
  },
  data() {
    return {
      filter: '',
      tree: {},
    }
  },
  mounted() {
    this.updateTree(this.root)
  },
  watch: {
    root(val) {
      this.filter = ''
      this.updateTree(val)
    },
    filter: debounce(function(val, old) {
      this.updateTree(this.root, val)
    }),
  },
  computed: {
    root() {
      function expand(name, node) {
        const result = { name }
        if (Array.isArray(node)) {
          result.children = node.map((val, index) => expand(index, val))
        } else if (node && typeof node === 'object') {
          result.children = []
          for (let key in node) {
            if (node.hasOwnProperty(key)) {
              result.children.push(expand(key, node[key]))
            }
          }
        } else {
          result.val = node
        }
        return result
      }

      return expand('root', this.content)
    }
  },
  methods: {
    updateTree(root, keyword) {
      function match(haystack) {
        if (!haystack)
          return false

        return `${haystack}`.toLowerCase().indexOf(keyword.toLowerCase()) > -1
      }

      function filter(node, isRoot) {
        const cow = () => {
          if (!node.children)
            return node
          
          const children = node.children.map(child => filter(child, false)).filter(child => child)
          return Object.assign({}, node, { children })
        }

        if (isRoot)
          return cow()

        if (node.val && match(node.val))
          return node

        if (match(node.name)) 
          return cow()
        
        return undefined
      }

      this.tree = (keyword && keyword.length) ? filter(root, true) : root
    },
    expandAll() {
      this.$refs.tree.toggleAll(true)
    },
    closeAll() {
      this.$refs.tree.toggleAll(false)
    }
  }
}
</script>

<style>
code {
  word-break: break-all;
}
</style>