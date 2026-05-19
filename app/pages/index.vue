<script setup lang="ts">
// @ts-nocheck
const { data: auth, refresh: refreshAuth } = await useFetch<any>('/api/me')
const { data: videos, status: videosStatus, refresh: refreshVideos } = await useFetch<any[]>('/api/youtube/videos', {
  immediate: false,
  watch: [auth]
})

const activeMainTab = ref('content')
const mainTabs = [
  { id: 'content', label: 'Content Management', icon: 'i-heroicons-rectangle-stack' },
  { id: 'analytics', label: 'Analytics', icon: 'i-heroicons-chart-bar' },
  { id: 'promotions', label: 'Promotions', icon: 'i-heroicons-megaphone' }
]

const { data: analytics, status: analyticsStatus, refresh: refreshAnalytics } = await useFetch<any>('/api/youtube/analytics', {
  immediate: false,
  watch: [auth]
})

const { data: promotions, status: promotionsStatus, refresh: refreshPromotions } = await useFetch<any>('/api/youtube/promotions', {
  immediate: false,
  watch: [auth]
})

watch(activeMainTab, (newVal) => {
  if (newVal === 'analytics' && !analytics.value && analyticsStatus.value !== 'pending') refreshAnalytics()
  if (newVal === 'promotions' && !promotions.value && promotionsStatus.value !== 'pending') refreshPromotions()
})

const selectedMetric = ref('views')

const chartOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, background: 'transparent', fontFamily: 'Inter, sans-serif' },
  theme: { mode: 'dark' },
  stroke: { curve: 'smooth', width: 3 },
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] } },
  xaxis: { categories: analytics.value?.dailyData?.map((d: any) => d.day) || [], labels: { style: { colors: '#9ca3af' } }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#9ca3af' }, formatter: (v: number) => Math.round(v) } },
  grid: { borderColor: '#333', strokeDashArray: 4 },
  colors: [selectedMetric.value === 'views' ? '#ef4444' : '#10b981']
}))

const chartSeries = computed(() => [
  { 
    name: selectedMetric.value === 'views' ? 'Views' : 'Subscribers Gained', 
    data: analytics.value?.dailyData?.map((d: any) => selectedMetric.value === 'views' ? d.views : d.subscribersGained) || [] 
  }
])

const trafficChartOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent' },
  theme: { mode: 'dark' },
  labels: analytics.value?.trafficData?.map((d: any) => d.source.replace('EXT_URL', 'External').replace('RELATED_VIDEO', 'Suggested').replace('YT_SEARCH', 'Search')) || [],
  colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
  stroke: { show: false },
  dataLabels: { enabled: false },
  legend: { position: 'bottom', labels: { colors: '#9ca3af' } }
}))

const trafficChartSeries = computed(() => analytics.value?.trafficData?.map((d: any) => d.views) || [])

const isLaunchModalOpen = ref(false)
const promotionForm = reactive({ videoId: '', dailyBudget: 10, durationDays: 7, targetLocations: '' })
const isLaunching = ref(false)

const showDevConsole = ref(false)
const devSystemInfo = ref<any>(null)
const devConsoleLoading = ref(false)
const isDevMode = computed(() => typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))

const fetchDevSystemInfo = async () => {
  try {
    devSystemInfo.value = await $fetch('/api/dev/control', {
      method: 'POST',
      body: { action: 'get_system_info' }
    })
  } catch (e) {
    console.error('Failed to fetch dev system info:', e)
  }
}

const runDevAction = async (action: string) => {
  devConsoleLoading.value = true
  try {
    const res: any = await $fetch('/api/dev/control', {
      method: 'POST',
      body: { action, channelId: auth.value?.channelId }
    })
    alert(res.message || 'Operation successful')
    if (action === 'clear_cache' || action === 'seed_history') {
      await refreshAuth()
      await refreshVideos()
      await refreshAnalytics()
      await refreshPromotions()
    }
  } catch (e: any) {
    alert(e.data?.message || 'Operation failed')
  } finally {
    devConsoleLoading.value = false
  }
}

watch(showDevConsole, (isOpen) => {
  if (isOpen) {
    fetchDevSystemInfo()
  }
})

const launchPromotion = async () => {
  isLaunching.value = true
  try {
    await $fetch('/api/youtube/promotions', { method: 'POST', body: promotionForm })
    isLaunchModalOpen.value = false
    refreshPromotions()
  } catch(e) {
    console.error(e)
  } finally {
    isLaunching.value = false
  }
}

const isManualRefreshing = ref(false)
const handleManualRefresh = async () => {
  isManualRefreshing.value = true
  try {
    await refreshVideos({ query: { refresh: 'true' } })
  } finally {
    isManualRefreshing.value = false
  }
}

onMounted(() => {
  setInterval(() => {
    refreshAuth()
  }, 300000)

  if (auth.value?.authenticated) {
    refreshVideos()
    
    // Surgical update for view counts every 30 seconds
    setInterval(async () => {
      if (!videos.value || videos.value.length === 0) return
      
      try {
        const statsMap = await $fetch<Record<string, string>>('/api/youtube/stats')
        videos.value.forEach(video => {
          if (statsMap[video.id]) {
            if (!video.statistics) video.statistics = {}
            video.statistics.viewCount = statsMap[video.id]
          }
        })
      } catch (e) {
        console.error('Failed to update live stats:', e)
      }
    }, 30000)
  }
})

const selectedVideos = ref<string[]>([])
const isUpdating = ref(false)
const isDeleting = ref(false)
const isDeleteConfirmed = ref(false)
const isClearModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const videoToDelete = ref<any>(null)
const isPlayerOpen = ref(false)
const selectedVideoForPlay = ref<any>(null)
const updateProgress = ref(0)

const form = reactive({
  title: '',
  description: '',
  tags: '',
  tagsAction: 'add',
  privacyStatus: '',
  categoryId: '',
  license: ''
})

const channelForm = reactive({
  title: auth.value?.channel?.title || '',
  description: auth.value?.channel?.description || ''
})

const searchQuery = ref('')
const isChannelModalOpen = ref(false)
const isChannelUpdating = ref(false)

const customAuthType = ref('tokens')
const customTokens = ref('')
const customApiKey = ref('')
const customChannelId = ref('')
const isCustomAuthSubmitting = ref(false)

const columns = [
  { id: 'select', key: 'select', label: 'Select' },
  { id: 'image', key: 'image', label: 'Image' },
  { id: 'title', key: 'title', label: 'Title', sortable: true },
  { id: 'stats', key: 'stats', label: 'Stats' },
  { id: 'status', key: 'status', label: 'Status' },
  { id: 'actions', key: 'actions', label: '' }
]

const items = [
  { label: 'Videos', icon: 'i-heroicons-video-camera', value: 'videos' },
  { label: 'Shorts', icon: 'i-heroicons-bolt', value: 'shorts' }
]

const filteredVideos = computed(() => {
  if (!videos.value) return []
  
  let result = videos.value.filter(v => {
    const durationStr = v.contentDetails?.duration || ''
    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!matches) return false
    
    const hours = parseInt(matches[1] || '0')
    const minutes = parseInt(matches[2] || '0')
    const seconds = parseInt(matches[3] || '0')
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds
    
    const isShort = totalSeconds <= 180
    return activeTab.value === 'shorts' ? isShort : !isShort
  })

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.snippet.title.toLowerCase().includes(q) || 
      v.snippet.description.toLowerCase().includes(q)
    )
  }

  return result.map(v => ({
    ...v,
    class: 'group'
  }))
})

const activeTab = ref('videos')

const toggleSelection = (id: string) => {
  const index = selectedVideos.value.indexOf(id)
  if (index > -1) {
    selectedVideos.value.splice(index, 1)
  } else {
    selectedVideos.value.push(id)
  }
}

const formatNumber = (num: string | number) => {
  const n = parseInt(String(num))
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(2) + 'K'
  return n.toString()
}

const selectAll = () => {
  if (selectedVideos.value.length === videos.value?.length) {
    selectedVideos.value = []
  } else {
    selectedVideos.value = videos.value?.map(v => v.id) || []
  }
}

const openPlayer = (video: any) => {
  selectedVideoForPlay.value = video
  isPlayerOpen.value = true
}

const populateForm = (video: any) => {
  form.title = video.snippet.title
  form.description = video.snippet.description
  form.tags = (video.snippet.tags || []).join(', ')
}

const showClearConfirm = ref(false)
const toast = useToast()

// Option 4: Description Previewer & SEO Helper
const showDescPreview = ref(false)

const charCountColor = computed(() => {
  const len = form.description?.length || 0
  if (len === 0) return 'text-zinc-500'
  if (len <= 4500) return 'text-emerald-500'
  if (len <= 5000) return 'text-amber-500'
  return 'text-red-500'
})

const seoHint = computed(() => {
  const len = form.description?.length || 0
  if (len === 0) return ''
  if (len < 150) return 'Short description (Aim for >150 chars for better SEO)'
  if (len <= 4500) return 'Good description length'
  if (len <= 5000) return 'Close to YouTube limit'
  return 'Exceeds maximum limit!'
})

const resolvedDescriptionPreview = computed(() => {
  let baseDesc = "This is a sample video description representing the original content of your video."
  if (selectedVideos.value.length === 1) {
    const video = (videos.value || []).find(v => v.id === selectedVideos.value[0])
    if (video) {
      baseDesc = video.snippet.description
    }
  }
  
  const template = form.description || '{{description}}'
  return template.replace(/\{\{description\}\}/g, baseDesc)
})

const formattedPreview = computed(() => {
  const escaped = (resolvedDescriptionPreview.value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const urlRegex = /(https?:\/\/[^\s]+)/g
  return escaped.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" class="text-red-400 hover:underline cursor-pointer">${url}</a>`
  })
})

const clearForm = () => {
  form.title = ''
  form.description = ''
  form.tags = ''
  showClearConfirm.value = false
  toast.add({ title: 'Form cleared', color: 'primary' })
}

const handleBatchUpdate = async () => {
  if (selectedVideos.value.length === 0) return
  
  isUpdating.value = true
  updateProgress.value = 0
  
  try {
    const res = await $fetch('/api/youtube/batch-update', {
      method: 'POST',
      body: {
        videoIds: selectedVideos.value,
        changes: {
          title: form.title || undefined,
          description: form.description || undefined,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined,
          tagsAction: form.tagsAction,
          privacyStatus: form.privacyStatus || undefined,
          categoryId: form.categoryId || undefined,
          license: form.license || undefined
        }
      }
    })
    
    // Refresh to see changes
    await refreshVideos()
    selectedVideos.value = []
    toast.add({ 
      title: 'Bulk Update Complete', 
      description: `Successfully updated ${selectedVideos.value.length} videos.`, 
      color: 'primary',
      icon: 'i-heroicons-check-badge'
    })
  } catch (e) {
    console.error(e)
    toast.add({ 
      title: 'Update Failed', 
      description: 'Something went wrong while updating your videos.', 
      color: 'primary',
      icon: 'i-heroicons-exclamation-triangle'
    })
  } finally {
    isUpdating.value = false
  }
}

const handleDeleteVideo = async () => {
  if (!videoToDelete.value) return
  
  isDeleting.value = true
  try {
    await $fetch('/api/youtube/delete', {
      method: 'POST',
      body: { videoIds: [videoToDelete.value.id] }
    })
    await refreshVideos()
    isDeleteModalOpen.value = false
    videoToDelete.value = null
    isDeleteConfirmed.value = false
    toast.add({ title: 'Video deleted successfully', color: 'primary' })
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Error deleting video', color: 'primary' })
  } finally {
    isDeleting.value = false
  }
}

const handleChannelUpdate = async () => {
  isChannelUpdating.value = true
  try {
    await $fetch('/api/youtube/channel-update', { 
      method: 'POST', 
      body: { 
        title: channelForm.title !== auth.value?.channel?.title ? channelForm.title : undefined, 
        description: channelForm.description 
      } 
    })
    await refreshAuth()
    isChannelModalOpen.value = false
    toast.add({ title: 'Channel updated successfully', color: 'primary' })
  } catch (e: any) {
    const msg = e.data?.message || e.message
    toast.add({ title: 'Update Failed', description: msg, color: 'primary' })
  } finally {
    isChannelUpdating.value = false
  }
}

const handleCustomAuth = async () => {
  isCustomAuthSubmitting.value = true
  try {
    const payload: any = {}
    if (customAuthType.value === 'tokens') {
      if (!customTokens.value.trim()) {
        toast.add({ title: 'Validation Error', description: 'Tokens JSON cannot be empty', color: 'primary' })
        return
      }
      payload.tokens = customTokens.value
    } else {
      if (!customApiKey.value.trim() || !customChannelId.value.trim()) {
        toast.add({ title: 'Validation Error', description: 'API Key and Channel ID are both required', color: 'primary' })
        return
      }
      payload.apiKey = customApiKey.value
      payload.channelId = customChannelId.value
    }

    await $fetch('/api/auth/session', {
      method: 'POST',
      body: payload
    })

    toast.add({ title: 'Authentication Successful', color: 'primary' })
    await refreshAuth()
    window.location.reload()
  } catch (e: any) {
    const msg = e.data?.message || e.message
    toast.add({ title: 'Authentication Failed', description: msg, color: 'primary' })
  } finally {
    isCustomAuthSubmitting.value = false
  }
}

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/session', {
      method: 'POST',
      body: { action: 'logout' }
    })
    isChannelModalOpen.value = false
    toast.add({ title: 'Account Disconnected', color: 'primary' })
    await refreshAuth()
    window.location.reload()
  } catch (e: any) {
    const msg = e.data?.message || e.message
    toast.add({ title: 'Logout Failed', description: msg, color: 'primary' })
  }
}

watch(isPlayerOpen, (val) => {
  if (!val) {
    selectedVideoForPlay.value = null
  }
})

watch(isDeleteModalOpen, (val) => {
  if (!val) {
    isDeleteConfirmed.value = false
  }
})
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <header class="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
      <div class="flex items-center gap-4">
        <AppLogo />
        <div>
          <h1 class="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
            YouTube Studio Agent
          </h1>
          <p class="text-zinc-500 font-medium">Bulk manage your channel content</p>
        </div>
      </div>

      <div v-if="auth?.authenticated" class="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" @click="isChannelModalOpen = true">
        <div class="text-right hidden md:block">
          <p class="font-medium">{{ auth.channel?.title }}</p>
          <p class="text-xs text-zinc-500">Channel Settings</p>
        </div>
        <UAvatar :src="auth.channel?.thumbnails?.default?.url" :alt="auth.channel?.title" size="lg" class="border-2 border-red-500/20" />
      </div>
      <a v-else href="/api/auth/login" class="btn-premium inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-red-900/20">
        <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
        Connect YouTube
      </a>
    </header>

    <!-- Channel Branding Banner -->
    <div v-if="auth?.authenticated" class="relative group">
      <!-- Banner Background -->
      <div 
        class="h-32 md:h-48 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 relative shadow-2xl"
      >
        <img 
          v-if="auth.branding?.image?.bannerExternalUrl"
          :src="auth.branding.image.bannerExternalUrl" 
          class="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
          alt="Channel Banner"
        />
        <div v-else class="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
          <UIcon name="i-heroicons-photo" class="w-12 h-12 text-zinc-800" />
        </div>
        
        <!-- Stats Overlay -->
        <div class="absolute bottom-4 left-6 flex items-center gap-6 bg-black/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
          <div class="flex flex-col">
            <span class="text-2xl font-black text-white leading-none">{{ formatNumber(auth.statistics?.subscriberCount || 0) }}</span>
            <span class="text-[10px] uppercase tracking-[0.2em] text-zinc-300 font-black mt-1">Subscribers</span>
          </div>
          <div class="h-10 w-px bg-white/10"></div>
          <div class="flex flex-col">
            <span class="text-2xl font-black text-white leading-none">{{ formatNumber(auth.statistics?.videoCount || 0) }}</span>
            <span class="text-[10px] uppercase tracking-[0.2em] text-zinc-300 font-black mt-1">Videos</span>
          </div>
        </div>

        <!-- Channel Handle Overlay -->
        <div class="absolute top-4 right-6 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
          <span class="text-xs font-bold text-zinc-300">{{ auth.channel?.customUrl || '@channel' }}</span>
        </div>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <div v-if="auth?.authenticated" class="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-white/5 w-fit">
      <button 
        v-for="tab in mainTabs" 
        :key="tab.id"
        @click="activeMainTab = tab.id"
        class="px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2"
        :class="activeMainTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'"
      >
        <UIcon :name="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Content Management Panel -->
    <div v-if="auth?.authenticated" v-show="activeMainTab === 'content'" class="grid lg:grid-cols-3 gap-8">
      <!-- Sidebar: Controls -->
      <aside class="space-y-6">
        <UCard class="glass-card">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-pencil-square" class="w-5 h-5 text-red-500" />
                <h3 class="font-bold">Bulk Edit Actions</h3>
              </div>
              <div class="flex items-center gap-1">
                <template v-if="!showClearConfirm">
                  <UButton 
                    variant="ghost" 
                    color="neutral" 
                    size="xs" 
                    icon="i-heroicons-trash" 
                    @click="showClearConfirm = true"
                  >
                    Clear
                  </UButton>
                </template>
                <template v-else>
                  <UButton variant="soft" color="primary" size="xs" @click="clearForm">Yes</UButton>
                  <UButton variant="ghost" color="neutral" size="xs" @click="showClearConfirm = false">No</UButton>
                </template>
              </div>
            </div>
          </template>

          <form @submit.prevent="handleBatchUpdate" class="space-y-4">
            <div v-if="auth?.isApiKey" class="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-xs flex gap-2 items-center mb-4">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 flex-shrink-0" />
              <span>Bulk edits are disabled under Public API Key authentication (Read-Only).</span>
            </div>

            <UFormField label="Title Template" help="Use {{title}} to preserve existing title">
              <UInput v-slot="{ inputProps }" v-model="form.title" placeholder="e.g. [NEW] {{title}}" :disabled="auth?.isApiKey" />
            </UFormField>
 
            <UFormField label="Description Template" help="Use {{description}} for existing content">
              <UTextarea v-slot="{ inputProps }" v-model="form.description" placeholder="Add links or text..." :rows="4" :disabled="auth?.isApiKey" />
              
              <div class="mt-2 space-y-2">
                <div class="flex items-center justify-between text-[11px]">
                  <div class="flex items-center gap-1.5 font-medium">
                    <span :class="charCountColor">{{ form.description?.length || 0 }} / 5000</span>
                    <span v-if="seoHint" class="text-zinc-500">• {{ seoHint }}</span>
                  </div>
                  <button 
                    type="button" 
                    @click="showDescPreview = !showDescPreview"
                    class="text-red-500 hover:text-red-400 font-bold transition flex items-center gap-1 cursor-pointer select-none"
                  >
                    <UIcon :name="showDescPreview ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'" class="w-3.5 h-3.5" />
                    {{ showDescPreview ? 'Hide Preview' : 'Show SEO & Preview' }}
                  </button>
                </div>

                <div v-if="showDescPreview" class="p-3 bg-zinc-900 border border-white/5 rounded-xl space-y-2 text-xs">
                  <div class="font-bold text-zinc-400 border-b border-white/5 pb-1 flex justify-between items-center text-[10px]">
                    <span>YOUTUBE DESCRIPTION PREVIEW</span>
                    <span class="text-[9px] text-zinc-500 font-normal">Line breaks & links simulated</span>
                  </div>
                  <div class="max-h-48 overflow-y-auto whitespace-pre-wrap break-all text-zinc-300 select-text leading-relaxed font-sans scrollbar-thin bg-zinc-950 p-2.5 rounded-lg border border-white/5" v-html="formattedPreview"></div>
                </div>
              </div>
            </UFormField>
 
            <UFormField label="Tags (comma separated)">
              <UInput v-slot="{ inputProps }" v-model="form.tags" placeholder="vlog, gaming, tech..." :disabled="auth?.isApiKey" />
            </UFormField>
 
            <UFormField label="Tags Action">
              <div class="flex p-1 bg-zinc-950 rounded-xl border border-white/5 w-full mt-1">
                <button 
                  type="button"
                  @click="!auth?.isApiKey && (form.tagsAction = 'add')"
                  class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em]"
                  :class="form.tagsAction === 'add' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-zinc-600 hover:text-zinc-400'"
                  :disabled="auth?.isApiKey"
                >
                  <UIcon name="i-heroicons-plus-circle" class="w-4 h-4" />
                  Append
                </button>
                <button 
                  type="button"
                  @click="!auth?.isApiKey && (form.tagsAction = 'replace')"
                  class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em]"
                  :class="form.tagsAction === 'replace' ? 'bg-zinc-800 text-white border border-white/10 shadow-xl' : 'text-zinc-600 hover:text-zinc-400'"
                  :disabled="auth?.isApiKey"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                  Overwrite
                </button>
              </div>
            </UFormField>
 
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Privacy Status">
                <USelectMenu v-model="form.privacyStatus" :items="([ { label: 'Public', value: 'public' }, { label: 'Private', value: 'private' }, { label: 'Unlisted', value: 'unlisted' }] as any[])" placeholder="Keep existing" value-attribute="value" :search-input="false" :disabled="auth?.isApiKey" />
              </UFormField>
              <UFormField label="Category">
                <USelectMenu v-model="form.categoryId" :items="([ { label: 'Gaming', value: '20' }, { label: 'Education', value: '27' }, { label: 'Entertainment', value: '24' }, { label: 'People & Blogs', value: '22' }] as any[])" placeholder="Keep existing" value-attribute="value" :search-input="false" :disabled="auth?.isApiKey" />
              </UFormField>
            </div>
 
            <USeparator class="my-6" />
 
            <UButton 
              type="submit" 
              color="primary" 
              block 
              class="btn-premium btn-update rounded-lg py-2.5 font-medium"
              :loading="isUpdating"
              :disabled="(selectedVideos?.length || 0) === 0 || auth?.isApiKey"
            >
              Update {{ selectedVideos?.length || 0 }} Videos
            </UButton>
          </form>
        </UCard>
      </aside>

      <!-- Video List -->
      <main class="lg:col-span-2 space-y-4">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <UTabs v-model="activeTab" :items="items" class="w-full max-w-xs" />
          <div class="flex items-center gap-2 w-full md:w-auto">
            <UInput v-model="searchQuery" icon="i-heroicons-magnifying-glass" placeholder="Search videos..." class="flex-grow md:w-64" />
            <UButton 
              color="primary" 
              variant="solid" 
              size="sm" 
              @click="handleManualRefresh" 
              icon="i-heroicons-arrow-path" 
              :loading="videosStatus === 'pending' || isManualRefreshing"
              class="btn-premium px-4 shadow-sm"
            >
              Refresh
            </UButton>
          </div>
        </div>

        <UCard class="glass-card !bg-zinc-900/20 overflow-hidden" :body-class="['!p-0']">
          <UTable 
            :data="filteredVideos" 
            :columns="columns"
            :loading="videosStatus === 'pending'"
            @row-click="({ row }) => toggleSelection(row.original.id)"
          >
            <template #select-header>
              <UCheckbox :model-value="(selectedVideos?.length || 0) === (videos?.length || 0) && (videos?.length || 0) > 0" @update:model-value="selectAll" />
            </template>

            <template #select-cell="{ row }">
              <UCheckbox :model-value="selectedVideos.includes(row.original.id)" @update:model-value="toggleSelection(row.original.id)" />
            </template>

            <template #image-cell="{ row }">
              <div class="flex justify-center">
                <div 
                  class="relative group cursor-pointer w-16 h-9 overflow-hidden rounded-lg shadow-lg border border-white/5" 
                  @click.stop="openPlayer(row.original)"
                >
                  <img 
                    :src="row.original.status.privacyStatus === 'private' 
                      ? `/api/youtube/thumbnail?id=${row.original.id}` 
                      : row.original.snippet.thumbnails.default.url" 
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <div class="w-6 h-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                      <UIcon name="i-heroicons-play-solid" class="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template #title-cell="{ row }">
              <div 
                class="max-w-xs truncate font-medium text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                @click.stop="populateForm(row.original)"
              >
                {{ row.original.snippet.title }}
              </div>
            </template>

            <template #stats-cell="{ row }">
              <div class="flex items-center gap-3 text-xs text-zinc-500">
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
                  {{ row.original.statistics?.viewCount || 0 }}
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-hand-thumb-up" class="w-3.5 h-3.5" />
                  {{ row.original.statistics?.likeCount || 0 }}
                </div>
              </div>
            </template>

            <template #status-cell="{ row }">
              <UBadge :color="row.original.status.privacyStatus === 'public' ? 'blue' : 'zinc'" variant="subtle">
                {{ row.original.status.privacyStatus }}
              </UBadge>
            </template>
            <template #actions-cell="{ row }">
              <UDropdownMenu :items="auth?.isApiKey ? [[
                { label: 'Play', icon: 'i-heroicons-play', onSelect: () => openPlayer(row.original) }
              ]] : [[
                { label: 'Play', icon: 'i-heroicons-play', onSelect: () => openPlayer(row.original) },
                { label: 'Fill Form', icon: 'i-heroicons-pencil', onSelect: () => populateForm(row.original) }
              ], [
                { label: 'Delete Video', icon: 'i-heroicons-trash', color: 'primary', onSelect: () => { videoToDelete = row.original; isDeleteModalOpen = true } }
              ]]">
                <UButton 
                  color="neutral" 
                  variant="ghost" 
                  icon="i-heroicons-ellipsis-horizontal" 
                  class="action-btn"
                  @click.stop
                />
              </UDropdownMenu>
            </template>
          </UTable>
        </UCard>
      </main>
    </div>

    <!-- Analytics Panel -->
    <div v-if="auth?.authenticated" v-show="activeMainTab === 'analytics'" class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div v-if="analyticsStatus === 'pending'" class="flex justify-center py-20"><UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-red-500" /></div>
      <div v-else-if="analytics" class="space-y-8">
        <div v-if="analytics.isDemoMode" class="p-3.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs flex gap-2.5 items-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 flex-shrink-0" />
          <div>
            <p class="font-bold">Estimating Channel Performance Insights</p>
            <p class="text-zinc-400 mt-0.5">We cannot fetch official reports because YouTube Analytics API is either not enabled or the current session is read-only. Displaying estimated trends scaled to your channel size ({{ auth?.statistics?.subscriberCount ? formatNumber(auth.statistics.subscriberCount) : '5,000' }} subscribers).</p>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UCard class="glass-card">
            <h4 class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total Views (30d)</h4>
            <p class="text-3xl font-black text-white mt-2">{{ formatNumber(analytics.dailyData.reduce((a: any, b: any) => a + b.views, 0)) }}</p>
          </UCard>
          <UCard class="glass-card">
            <h4 class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Watch Time (mins)</h4>
            <p class="text-3xl font-black text-white mt-2">{{ formatNumber(analytics.dailyData.reduce((a: any, b: any) => a + b.watchTime, 0)) }}</p>
          </UCard>
          <UCard class="glass-card">
            <h4 class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Avg Duration</h4>
            <p class="text-3xl font-black text-white mt-2">{{ Math.round(analytics.dailyData.reduce((a: any, b: any) => a + b.avgViewDuration, 0) / (analytics.dailyData.length || 1)) }}s</p>
          </UCard>
          <UCard class="glass-card">
            <h4 class="text-xs text-zinc-400 font-bold uppercase tracking-wider">Subs Gained</h4>
            <p class="text-3xl font-black text-green-400 mt-2">+{{ formatNumber(analytics.dailyData.reduce((a: any, b: any) => a + b.subscribersGained, 0)) }}</p>
          </UCard>
        </div>
        <div class="grid lg:grid-cols-3 gap-8">
          <UCard class="glass-card lg:col-span-2">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-lg">{{ selectedMetric === 'views' ? 'Daily Views' : 'Subscribers Gained' }}</h3>
                <div class="flex p-0.5 bg-zinc-950 rounded-lg border border-white/5">
                  <button 
                    type="button" 
                    @click="selectedMetric = 'views'"
                    class="px-2.5 py-1 text-xs rounded-md transition font-semibold cursor-pointer select-none"
                    :class="selectedMetric === 'views' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
                  >
                    Views
                  </button>
                  <button 
                    type="button" 
                    @click="selectedMetric = 'subscribers'"
                    class="px-2.5 py-1 text-xs rounded-md transition font-semibold cursor-pointer select-none"
                    :class="selectedMetric === 'subscribers' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'"
                  >
                    Subscribers
                  </button>
                </div>
              </div>
            </template>
            <ClientOnly><apexchart type="area" height="350" :options="chartOptions" :series="chartSeries"></apexchart></ClientOnly>
          </UCard>
          <UCard class="glass-card lg:col-span-1">
            <template #header><h3 class="font-bold text-lg">Traffic Sources</h3></template>
            <ClientOnly><apexchart type="donut" height="350" :options="trafficChartOptions" :series="trafficChartSeries"></apexchart></ClientOnly>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Promotions Panel -->
    <div v-if="auth?.authenticated" v-show="activeMainTab === 'promotions'" class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div v-if="promotionsStatus === 'pending'" class="flex justify-center py-20"><UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-red-500" /></div>
      <div v-else-if="promotions" class="space-y-8">
        <div class="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
          <div>
            <h2 class="text-xl font-bold text-white">Active Campaigns</h2>
            <p class="text-zinc-400 text-sm mt-1" v-if="promotions.isDemoMode">{{ promotions.message }}</p>
          </div>
          <UButton color="primary" size="lg" icon="i-heroicons-plus" @click="isLaunchModalOpen = true" :disabled="auth?.isApiKey" class="btn-premium font-bold">Launch Promotion</UButton>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <UCard v-for="camp in promotions.campaigns" :key="camp.id" class="glass-card relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex gap-4">
              <img :src="camp.thumbnailUrl" class="w-24 h-16 object-cover rounded-lg border border-white/10" />
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <h3 class="font-bold text-white line-clamp-1">{{ camp.videoTitle || 'Promoted Video' }}</h3>
                  <UBadge :color="camp.status === 'ACTIVE' ? 'green' : 'zinc'" variant="subtle">{{ camp.status }}</UBadge>
                </div>
                <p class="text-xs text-zinc-500 mt-1">ID: {{ camp.id }} • {{ camp.dailyBudget }} {{ camp.currencyCode }}/day</p>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mt-6">
              <div><p class="text-xs text-zinc-500 uppercase font-bold">Impressions</p><p class="text-lg font-black">{{ formatNumber(camp.impressions) }}</p></div>
              <div><p class="text-xs text-zinc-500 uppercase font-bold">Clicks</p><p class="text-lg font-black">{{ formatNumber(camp.clicks) }}</p></div>
              <div><p class="text-xs text-zinc-500 uppercase font-bold">Cost</p><p class="text-lg font-black text-red-400">${{ camp.cost.toFixed(2) }}</p></div>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Empty State / Authentication Interface -->
    <div v-else-if="!auth?.authenticated" class="max-w-md w-full mx-auto py-12 px-6 bg-zinc-950/40 border border-white/5 rounded-2xl shadow-2xl flex flex-col items-center space-y-8 backdrop-blur-xl animate-[fadeIn_0.5s_ease-out]">
      <div class="flex flex-col items-center space-y-3 text-center">
        <div class="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg shadow-red-955/20">
          <UIcon name="i-heroicons-lock-closed" class="w-8 h-8" />
        </div>
        <h2 class="text-2xl font-black text-white">YouTube Studio Agent</h2>
        <p class="text-sm text-zinc-400">Manage your channels, update metadata, and track metrics effortlessly.</p>
      </div>

      <!-- Action: Google OAuth -->
      <div class="w-full space-y-3">
        <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Default Authentication</p>
        <a href="/api/auth/login" class="btn-premium flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-red-900/20 w-full text-center">
          <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
          Connect via Google Account
        </a>
      </div>

      <div class="flex items-center w-full my-4">
        <div class="flex-grow border-t border-white/5"></div>
        <span class="mx-3 text-xs font-bold text-zinc-600 uppercase tracking-wider">Or</span>
        <div class="flex-grow border-t border-white/5"></div>
      </div>

      <!-- Action: Custom API Credentials -->
      <div class="w-full space-y-4">
        <div class="flex justify-between items-center">
          <p class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custom Credentials</p>
          <div class="flex bg-zinc-900 p-0.5 rounded-lg border border-white/5">
            <button 
              class="text-[10px] font-bold px-2 py-1 rounded" 
              :class="customAuthType === 'tokens' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
              @click="customAuthType = 'tokens'"
            >
              Shared Tokens
            </button>
            <button 
              class="text-[10px] font-bold px-2 py-1 rounded" 
              :class="customAuthType === 'apiKey' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
              @click="customAuthType = 'apiKey'"
            >
              Public API Key
            </button>
          </div>
        </div>

        <form @submit.prevent="handleCustomAuth" class="space-y-4">
          <!-- Shared Tokens Input -->
          <div v-if="customAuthType === 'tokens'" class="space-y-2">
            <label class="text-xs font-medium text-zinc-400">Tokens JSON</label>
            <UTextarea 
              v-slot="{ inputProps }"
              v-model="customTokens" 
              placeholder='{"access_token": "...", "refresh_token": "..."}' 
              :rows="4" 
              class="w-full !bg-zinc-900/50 border-white/5 font-mono text-xs leading-relaxed" 
            />
            <p class="text-[10px] text-zinc-500">Paste your exported session tokens JSON string to connect.</p>
          </div>

          <!-- Public API Key + Channel ID Input -->
          <div v-else class="space-y-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-zinc-400">API Key</label>
              <UInput 
                v-model="customApiKey" 
                placeholder="AIzaSy..." 
                type="password"
                class="w-full !bg-zinc-900/50 border-white/5" 
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-zinc-400">Channel ID</label>
              <UInput 
                v-model="customChannelId" 
                placeholder="UC..." 
                class="w-full !bg-zinc-900/50 border-white/5" 
              />
            </div>
            <p class="text-[10px] text-zinc-500">Public data only. Write operations will be disabled.</p>
          </div>

          <UButton type="submit" color="neutral" class="w-full font-semibold py-2.5 rounded-xl border border-white/10 hover:bg-zinc-900" :loading="isCustomAuthSubmitting">
            Apply Credentials
          </UButton>
        </form>
      </div>
    </div>

    <!-- Video Player Modal -->
    <UModal v-model:open="isPlayerOpen" :ui="{ overlay: 'bg-black/80 backdrop-blur-xl' }">
      <template #content>
        <div class="bg-black rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full mx-auto">
          <div class="aspect-video w-full">
            <iframe 
              v-if="selectedVideoForPlay"
              :src="`https://www.youtube.com/embed/${selectedVideoForPlay.id}?autoplay=1`"
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          <div class="p-4 bg-zinc-900 flex items-center justify-between border-t border-white/5">
            <div class="truncate mr-4">
              <h4 class="font-bold truncate text-white">{{ selectedVideoForPlay?.snippet?.title }}</h4>
              <p class="text-xs text-zinc-500">{{ selectedVideoForPlay?.snippet?.channelTitle }}</p>
            </div>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="isPlayerOpen = false" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" :ui="{ overlay: 'bg-black/80 backdrop-blur-xl' }">
      <template #content>
        <UCard class="glass-card !bg-zinc-950 border-red-500/20 shadow-2xl">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-trash" class="w-5 h-5 text-red-500" />
              <h3 class="font-bold text-red-500">DANGER: Permanent Deletion</h3>
            </div>
          </template>

          <div class="py-4 space-y-4">
            <p class="text-zinc-300">
              You are about to permanently delete this video from your YouTube channel. This action <span class="font-bold text-red-500 underline">cannot be undone</span>.
            </p>
            <div class="p-3 bg-zinc-900 rounded-lg border border-white/5">
              <p class="text-xs text-zinc-500 uppercase font-bold mb-1">Video Title</p>
              <p class="text-sm font-medium">{{ videoToDelete?.snippet?.title }}</p>
            </div>
            
            <div class="pt-4 border-t border-white/5">
              <UCheckbox 
                v-model="isDeleteConfirmed" 
                color="primary" 
                label="I understand that this action is permanent and irreversible." 
                class="text-red-400 font-medium"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3 w-full">
              <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false" :disabled="isDeleting">Cancel</UButton>
              <UButton 
                color="primary" 
                variant="solid"
                icon="i-heroicons-exclamation-triangle"
                @click="handleDeleteVideo" 
                :loading="isDeleting" 
                :disabled="!isDeleteConfirmed"
                class="btn-premium bg-red-600 hover:bg-red-700 text-white font-bold px-6 shadow-lg shadow-red-900/40"
              >
                Permanently Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Channel Settings Modal -->
    <UModal v-model:open="isChannelModalOpen" :ui="{ overlay: 'bg-black/80 backdrop-blur-xl' }">
      <template #content>
        <UCard class="glass-card !bg-zinc-950 border-white/5 shadow-2xl max-w-2xl w-full mx-auto">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-red-500" />
              <h3 class="font-bold text-lg">Channel Identity</h3>
            </div>
          </template>

          <form @submit.prevent="handleChannelUpdate" class="space-y-6 py-4">
            <div v-if="auth?.isApiKey" class="p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-xs flex gap-2 items-center mb-4">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 flex-shrink-0" />
              <span>You are authenticated via a Public API Key (Read-Only). Channel modifications are disabled.</span>
            </div>

            <UFormField label="Channel Title" help="Updating title may require channel verification">
              <UInput 
                v-model="channelForm.title" 
                :placeholder="auth.channel?.title" 
                :disabled="auth?.isApiKey"
                class="w-full !bg-zinc-900/50 border-white/5"
              />
            </UFormField>
            <UFormField label="Channel Description">
              <UTextarea 
                v-model="channelForm.description" 
                :placeholder="auth.channel?.description" 
                :rows="8" 
                :disabled="auth?.isApiKey"
                class="w-full !bg-zinc-900/50 border-white/5 font-sans leading-relaxed"
              />
            </UFormField>
            
            <div class="flex justify-between items-center pt-6 border-t border-white/5 w-full">
              <UButton 
                color="danger" 
                variant="subtle" 
                icon="i-heroicons-arrow-left-on-rectangle" 
                @click="handleLogout"
              >
                Disconnect
              </UButton>
              <div class="flex gap-3">
                <UButton color="neutral" variant="ghost" @click="isChannelModalOpen = false">Cancel</UButton>
                <UButton v-if="!auth?.isApiKey" type="submit" color="primary" :loading="isChannelUpdating" class="btn-premium px-8">Save Changes</UButton>
              </div>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Launch Promotion Modal -->
    <UModal v-model:open="isLaunchModalOpen" :ui="{ overlay: 'bg-black/80 backdrop-blur-xl' }">
      <template #content>
        <UCard class="glass-card !bg-zinc-950 shadow-2xl">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-megaphone" class="w-5 h-5 text-red-500" />
              <h3 class="font-bold text-white">Launch Ad Promotion</h3>
            </div>
          </template>

          <form @submit.prevent="launchPromotion" class="space-y-6 py-4">
            <UFormField label="Select Video to Promote">
              <USelectMenu 
                v-model="promotionForm.videoId" 
                :items="videos?.filter((v: any) => v.status?.privacyStatus !== 'private').map((v: any) => ({ label: v.snippet.title, value: v.id })) || []" 
                value-attribute="value"
                placeholder="Select a video..."
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Daily Budget ($)">
                <UInput type="number" v-model="promotionForm.dailyBudget" min="1" placeholder="10" />
              </UFormField>
              <UFormField label="Duration (Days)">
                <UInput type="number" v-model="promotionForm.durationDays" min="1" placeholder="7" />
              </UFormField>
            </div>

            <UFormField label="Target Locations (Optional)">
              <UInput v-model="promotionForm.targetLocations" placeholder="e.g. United States, UK" />
            </UFormField>

            <div class="flex justify-end gap-3 pt-6 border-t border-white/5">
              <UButton color="neutral" variant="ghost" @click="isLaunchModalOpen = false">Cancel</UButton>
              <UButton type="submit" color="primary" :loading="isLaunching" class="btn-premium px-8" :disabled="!promotionForm.videoId">Launch Campaign</UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
    <!-- Floating Dev Console Toggle -->
    <div v-if="isDevMode" class="fixed bottom-6 right-6 z-50">
      <UButton
        icon="i-heroicons-cpu-chip"
        color="red"
        variant="solid"
        class="rounded-full shadow-2xl hover:scale-105 transition-transform cursor-pointer font-bold px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-500 text-white border border-red-400/20"
        @click="showDevConsole = true"
      >
        Dev Console
      </UButton>
    </div>

    <!-- Developer Console Modal -->
    <UModal v-model:open="showDevConsole" :ui="{ overlay: 'bg-black/90 backdrop-blur-xl' }">
      <template #content>
        <UCard class="glass-card !bg-zinc-950/95 border border-red-500/20 shadow-2xl max-w-lg w-full overflow-hidden">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-red-500">
                <UIcon name="i-heroicons-command-line" class="w-6 h-6 animate-pulse" />
                <h3 class="font-mono font-bold tracking-widest text-lg text-white">YOUTUBE_AGENT_DEV_CONSOLE</h3>
              </div>
              <div class="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                Active dev_server
              </div>
            </div>
          </template>

          <div class="space-y-6 py-2">
            <!-- System Stats Dashboard -->
            <div v-if="devSystemInfo" class="grid grid-cols-3 gap-3 p-3 bg-zinc-900/60 rounded-xl border border-white/5 font-mono text-[11px]">
              <div>
                <span class="text-zinc-500 block uppercase text-[9px]">Environment</span>
                <span class="text-emerald-400 font-bold">{{ devSystemInfo.env.nodeEnv }}</span>
              </div>
              <div>
                <span class="text-zinc-500 block uppercase text-[9px]">Node Port</span>
                <span class="text-white">{{ devSystemInfo.env.port }}</span>
              </div>
              <div>
                <span class="text-zinc-500 block uppercase text-[9px]">Memory Used</span>
                <span class="text-red-400 font-bold">{{ devSystemInfo.memory.heapUsed }}</span>
              </div>
            </div>

            <!-- Developer Actions List -->
            <div class="space-y-4">
              <h4 class="font-mono font-bold text-xs text-zinc-400 uppercase tracking-wider">Database & Cache Manager</h4>
              <div class="grid grid-cols-2 gap-3">
                <UButton
                  color="danger"
                  variant="subtle"
                  icon="i-heroicons-trash"
                  class="w-full font-mono text-xs justify-center py-2.5 border border-red-500/20 hover:bg-red-500/5 cursor-pointer"
                  :loading="devConsoleLoading"
                  @click="runDevAction('clear_cache')"
                >
                  Clear Caches
                </UButton>
                
                <UButton
                  color="primary"
                  variant="subtle"
                  icon="i-heroicons-bolt"
                  class="w-full font-mono text-xs justify-center py-2.5 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5 cursor-pointer"
                  :loading="devConsoleLoading"
                  @click="runDevAction('seed_history')"
                >
                  Seed Mock History
                </UButton>
              </div>
            </div>

            <div class="space-y-4 pt-4 border-t border-white/5">
              <h4 class="font-mono font-bold text-xs text-zinc-400 uppercase tracking-wider">Application Helpers</h4>
              <div class="p-3 bg-zinc-900/40 rounded-xl border border-white/5 text-[11px] font-mono leading-relaxed text-zinc-400 space-y-2">
                <div class="flex justify-between">
                  <span>Channel ID:</span>
                  <span class="text-zinc-300 font-bold">{{ auth?.channelId || 'None' }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Auth Type:</span>
                  <span class="text-zinc-300 font-bold">{{ auth?.isApiKey ? 'Public API Key' : 'Google OAuth' }}</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-4 border-t border-white/5">
              <UButton color="neutral" variant="ghost" class="font-mono text-xs cursor-pointer" @click="showDevConsole = false">Close Console</UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
